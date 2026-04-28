import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth, type Component, type OverlayHandle, type TUI } from "@mariozechner/pi-tui";

const WIDGET_ID = "task-runner";
const ROOT_DIR = ".pi/task-runs";
const CURRENT_FILE = join(ROOT_DIR, "current.json");

type TaskStatus = "pending" | "running" | "done" | "failed" | "skipped";

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  lineIndex: number;
  sessionFile?: string;
  handoffFile?: string;
  exitCode?: number | null;
};

type RunState = {
  id: string;
  cwd: string;
  dir: string;
  sourceTasksFile: string;
  tasksFile: string;
  notesFile: string;
  status: "idle" | "running" | "stopped" | "done" | "failed";
  currentTaskId?: string;
  latestEvent?: string;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
};

let currentRun: RunState | undefined;
let activeChild: ChildProcessWithoutNullStreams | undefined;
let stopRequested = false;
let planningTasksFile: string | undefined;
let planningOverlayHandle: OverlayHandle | undefined;
let planningOverlayTui: TUI | undefined;
let planningOverlayInterval: NodeJS.Timeout | undefined;

function now() {
  return new Date().toISOString();
}

function padToWidth(line: string, width: number) {
  return line + " ".repeat(Math.max(0, width - visibleWidth(line)));
}

class TasksOverlay implements Component {
  invalidate() {}

  render(width: number): string[] {
    if (!planningTasksFile) return [];

    const contentWidth = Math.max(1, width - 4);
    const title = ` TASKS.md planning `;
    const topRule = Math.max(0, width - 2 - visibleWidth(title));
    const lines = [
      `╭${title}${"─".repeat(topRule)}╮`,
      `│ ${padToWidth(truncateToWidth(planningTasksFile, contentWidth), contentWidth)} │`,
      `├${"─".repeat(Math.max(0, width - 2))}┤`,
    ];

    const markdown = existsSync(planningTasksFile) ? readText(planningTasksFile) : "(TASKS.md does not exist yet)";
    const body = markdown.trimEnd().split("\n");
    for (const line of body.length ? body : [""]) {
      lines.push(`│ ${padToWidth(truncateToWidth(line, contentWidth), contentWidth)} │`);
    }

    lines.push(`╰${"─".repeat(Math.max(0, width - 2))}╯`);
    return lines;
  }
}

function refreshPlanningOverlay() {
  planningOverlayTui?.requestRender();
}

function showPlanningOverlay(ctx: ExtensionContext) {
  if (!planningOverlayInterval) {
    planningOverlayInterval = setInterval(refreshPlanningOverlay, 1000);
  }

  if (planningOverlayHandle) {
    planningOverlayHandle.setHidden(false);
    refreshPlanningOverlay();
    return;
  }

  void ctx.ui.custom((tui) => {
    planningOverlayTui = tui;
    return new TasksOverlay();
  }, {
    overlay: true,
    overlayOptions: {
      anchor: "right-center",
      width: "50%",
      maxHeight: "80%",
      margin: 1,
      nonCapturing: true,
    },
    onHandle: (handle) => {
      planningOverlayHandle = handle;
    },
  });
}

function hidePlanningOverlay() {
  if (planningOverlayInterval) {
    clearInterval(planningOverlayInterval);
    planningOverlayInterval = undefined;
  }
  planningOverlayHandle?.hide();
  planningOverlayHandle = undefined;
  planningOverlayTui = undefined;
}

function enterPlanningMode(ctx: ExtensionContext, tasksFile: string) {
  planningTasksFile = resolve(ctx.cwd, tasksFile);
  showPlanningOverlay(ctx);
  refreshPlanningOverlay();
}

function buildPlanningPrompt(userText: string) {
  return `We are in task-run planning mode.

The user is having a back-and-forth planning conversation with you. Based on their latest message, update this markdown task file in-place:

${planningTasksFile}

Keep the file as a clear markdown checklist for /taskrun start. Use unchecked checkbox lines for runnable tasks, e.g.:
- [ ] First concrete task
- [ ] Second concrete task

Guidelines:
- Ask clarifying questions when needed.
- If the user's answer changes scope, revise TASKS.md accordingly.
- Keep tasks concrete, sequential, and suitable for autonomous child pi sessions.
- Preserve useful notes/headings, but the actionable work should be markdown checkbox tasks.
- After updating the file, briefly summarize what changed and ask the next useful planning question.

User message:
${userText}`;
}

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

function runId() {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return `${stamp}-${Math.random().toString(36).slice(2, 8)}`;
}

function readText(path: string) {
  return readFileSync(path, "utf8");
}

function writeJson(path: string, value: unknown) {
  ensureDir(join(path, ".."));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function saveRun(run: RunState) {
  run.updatedAt = now();
  writeJson(join(run.dir, "state.json"), run);
  writeJson(CURRENT_FILE, { runDir: run.dir });
}

function loadRunFromDir(dir: string): RunState | undefined {
  const stateFile = join(dir, "state.json");
  if (!existsSync(stateFile)) return undefined;
  return JSON.parse(readText(stateFile)) as RunState;
}

function loadCurrentRun(): RunState | undefined {
  if (currentRun) return currentRun;
  if (!existsSync(CURRENT_FILE)) return undefined;
  try {
    const { runDir } = JSON.parse(readText(CURRENT_FILE)) as { runDir?: string };
    if (!runDir) return undefined;
    currentRun = loadRunFromDir(runDir);
    return currentRun;
  } catch {
    return undefined;
  }
}

function parseTasks(markdown: string): Task[] {
  const tasks: Task[] = [];
  const lines = markdown.split("\n");

  lines.forEach((line, lineIndex) => {
    const match = line.match(/^\s*[-*]\s+\[([ xX])]\s+(.+?)\s*$/);
    if (!match) return;

    const id = `task-${String(tasks.length + 1).padStart(3, "0")}`;
    tasks.push({
      id,
      title: match[2]!,
      status: match[1]?.toLowerCase() === "x" ? "done" : "pending",
      lineIndex,
    });
  });

  return tasks;
}

function updateTasksMarkdown(run: RunState) {
  const lines = readText(run.tasksFile).split("\n");

  for (const task of run.tasks) {
    const line = lines[task.lineIndex];
    if (!line) continue;
    const checked = task.status === "done" ? "x" : " ";
    lines[task.lineIndex] = line.replace(/\[([ xX])] /, `[${checked}] `);
  }

  writeFileSync(run.tasksFile, lines.join("\n"), "utf8");
}

function tail(text: string, maxLines = 8) {
  const lines = text.trim().split("\n").filter(Boolean);
  return lines.slice(Math.max(0, lines.length - maxLines)).join("\n");
}

function renderWidget(run?: RunState): string[] {
  if (!run) return ["task-runner: no active run"];

  const lines = [`task-runner ${run.status}: ${basename(run.dir)}`];
  for (const task of run.tasks) {
    const icon =
      task.status === "done" ? "✓" :
      task.status === "running" ? "▶" :
      task.status === "failed" ? "✗" :
      task.status === "skipped" ? "⊘" : "○";
    lines.push(`${icon} ${task.id} ${task.title}`);
  }

  if (run.latestEvent) lines.push(`latest: ${run.latestEvent}`);

  if (existsSync(run.notesFile)) {
    const noteTail = tail(readText(run.notesFile), 5);
    if (noteTail) {
      lines.push("notes:");
      lines.push(...noteTail.split("\n").map((line) => `  ${line}`));
    }
  }

  return lines;
}

function updateWidget(ctx: ExtensionContext, run = currentRun) {
  ctx.ui.setWidget(WIDGET_ID, renderWidget(run), { placement: "belowEditor" });
}

function defaultTasksFile() {
  return planningTasksFile || join(ROOT_DIR, "TASKS.md");
}

function createRun(cwd: string, tasksFileArg: string): RunState {
  const sourceTasksFile = resolve(cwd, tasksFileArg);
  if (!existsSync(sourceTasksFile)) throw new Error(`Tasks file not found: ${tasksFileArg}`);

  const markdown = readText(sourceTasksFile);
  const tasks = parseTasks(markdown);
  if (tasks.length === 0) throw new Error("No markdown checkbox tasks found. Use lines like: - [ ] Do thing");

  const id = runId();
  const dir = join(ROOT_DIR, id);
  ensureDir(join(dir, "sessions"));
  ensureDir(join(dir, "handoffs"));

  const tasksFile = join(dir, "tasks.md");
  const notesFile = join(dir, "notes.md");
  writeFileSync(tasksFile, markdown, "utf8");
  writeFileSync(notesFile, `# Task Run Notes\n\nRun: ${id}\nSource tasks: ${sourceTasksFile}\n\n`, "utf8");

  const run: RunState = {
    id,
    cwd,
    dir,
    sourceTasksFile,
    tasksFile,
    notesFile,
    status: "idle",
    tasks,
    createdAt: now(),
    updatedAt: now(),
  };

  saveRun(run);
  return run;
}

function buildPrompt(run: RunState, task: Task) {
  const allTasks = run.tasks.map((t) => `${t.id} [${t.status}] ${t.title}`).join("\n");
  const notes = existsSync(run.notesFile) ? readText(run.notesFile) : "";

  return `You are a subtask worker in a larger pi task run.\n\nOverall task list:\n${allTasks}\n\nCurrent subtask:\n${task.id}: ${task.title}\n\nShared handoff notes so far:\n${notes || "(none yet)"}\n\nRules:\n- Work only on the current subtask.\n- You may inspect and modify files as needed for this subtask.\n- Do not start later subtasks unless they are necessary to complete this one.\n- Before finishing, append handoff notes to this file: ${run.notesFile}\n- Also write a structured JSON handoff to this exact file: ${task.handoffFile}\n\nThe JSON handoff should have this shape:\n{\n  "taskId": "${task.id}",\n  "status": "done",\n  "summary": "...",\n  "filesTouched": ["..."],\n  "notesForNextTask": ["..."],\n  "risksOrUnknowns": ["..."]\n}\n\nHandoff notes should include what changed, what you learned, files touched, risks/unknowns, and recommendations for the next task.\n`; 
}

function runChildPi(run: RunState, task: Task, ctx: ExtensionContext): Promise<number | null> {
  return new Promise((resolve) => {
    task.sessionFile = join(run.dir, "sessions", `${task.id}.jsonl`);
    task.handoffFile = join(run.dir, "handoffs", `${task.id}.json`);
    const prompt = buildPrompt(run, task);

    activeChild = spawn("pi", ["--no-extensions", "--mode", "json", "--session", task.sessionFile, prompt], {
      cwd: run.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdoutBuffer = "";
    activeChild.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line) as { type?: string; toolName?: string; isError?: boolean; message?: unknown };
          if (event.type === "tool_execution_start") run.latestEvent = `${task.id}: tool ${event.toolName}`;
          else if (event.type === "tool_execution_end") run.latestEvent = `${task.id}: tool ${event.toolName} ${event.isError ? "failed" : "done"}`;
          else if (event.type === "turn_start") run.latestEvent = `${task.id}: thinking`;
          else if (event.type === "agent_end") run.latestEvent = `${task.id}: finished`;
          if (run.latestEvent) updateWidget(ctx, run);
        } catch {
          // Ignore non-JSON noise.
        }
      }
    });

    activeChild.stderr.on("data", (chunk) => {
      const text = chunk.toString().trim();
      if (text) {
        run.latestEvent = `${task.id}: ${text.split("\n").at(-1)}`;
        updateWidget(ctx, run);
      }
    });

    activeChild.on("close", (code) => {
      activeChild = undefined;
      resolve(code);
    });

    activeChild.on("error", () => {
      activeChild = undefined;
      resolve(1);
    });
  });
}

async function runQueue(ctx: ExtensionContext, run: RunState) {
  if (run.status === "running") return;

  stopRequested = false;
  run.status = "running";
  saveRun(run);
  updateWidget(ctx, run);

  for (const task of run.tasks) {
    if (stopRequested) break;
    if (task.status === "done" || task.status === "skipped") continue;

    task.status = "running";
    run.currentTaskId = task.id;
    run.latestEvent = `${task.id}: starting`;
    updateTasksMarkdown(run);
    saveRun(run);
    updateWidget(ctx, run);

    const code = await runChildPi(run, task, ctx);
    task.exitCode = code;

    if (stopRequested) {
      task.status = "pending";
      run.status = "stopped";
      run.latestEvent = `${task.id}: stopped`;
      break;
    }

    if (code === 0) {
      task.status = "done";
      run.latestEvent = `${task.id}: done`;
    } else {
      task.status = "failed";
      run.status = "failed";
      run.latestEvent = `${task.id}: failed with exit code ${code}`;
      break;
    }

    updateTasksMarkdown(run);
    saveRun(run);
    updateWidget(ctx, run);
  }

  if (run.status === "running") {
    run.status = "done";
    run.currentTaskId = undefined;
    run.latestEvent = "all tasks complete";
  }

  updateTasksMarkdown(run);
  saveRun(run);
  updateWidget(ctx, run);
  ctx.ui.notify(`Task run ${run.status}: ${run.id}`, run.status === "done" ? "success" : run.status === "failed" ? "error" : "info");
}

function help() {
  return [
    "taskrun commands:",
    "  /taskrun init [tasks.md]      create/open TASKS.md, enter planning mode, show overlay",
    "  /taskrun plan [tasks.md]      enter planning mode for an existing task file",
    "  /taskrun hide                 exit planning mode and hide TASKS.md overlay",
    "  /taskrun start [tasks.md]     run unchecked markdown checkbox tasks",
    "  /taskrun status               show current run widget",
    "  /taskrun notes                show current notes path and widget",
    "  /taskrun stop                 stop the active child pi process",
  ].join("\n");
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    currentRun = loadCurrentRun();
    if (currentRun) updateWidget(ctx, currentRun);
  });

  pi.on("session_shutdown", () => {
    hidePlanningOverlay();
  });

  pi.on("input", (event) => {
    if (event.source === "extension") return { action: "continue" as const };
    if (!planningTasksFile) return { action: "continue" as const };
    if (event.text.trimStart().startsWith("/")) return { action: "continue" as const };

    refreshPlanningOverlay();
    return { action: "transform" as const, text: buildPlanningPrompt(event.text), images: event.images };
  });

  pi.registerCommand("taskrun", {
    description: "Run a markdown task list as sequential child pi sessions with shared handoff notes",
    handler: async (args, ctx) => {
      const [command, ...rest] = args.trim().split(/\s+/).filter(Boolean);

      if (!command || command === "help") {
        ctx.ui.notify(help(), "info");
        return;
      }

      if (command === "init") {
        const file = rest.join(" ") || join(ROOT_DIR, "TASKS.md");
        const absoluteFile = resolve(ctx.cwd, file);
        ensureDir(join(absoluteFile, ".."));
        if (!existsSync(absoluteFile)) {
          writeFileSync(absoluteFile, `# Task Run\n\n## Goal\n\nDescribe the goal here.\n\n## Tasks\n\n- [ ] First concrete task\n- [ ] Second concrete task\n- [ ] Final verification\n`, "utf8");
        }
        enterPlanningMode(ctx, file);
        ctx.ui.notify(`Planning mode active: ${absoluteFile}`, "success");
        return;
      }

      if (command === "plan") {
        const file = rest.join(" ") || join(ROOT_DIR, "TASKS.md");
        const absoluteFile = resolve(ctx.cwd, file);
        if (!existsSync(absoluteFile)) {
          ctx.ui.notify(`Tasks file not found: ${file}. Use /taskrun init ${file}`, "error");
          return;
        }
        enterPlanningMode(ctx, file);
        ctx.ui.notify(`Planning mode active: ${absoluteFile}`, "success");
        return;
      }

      if (command === "hide") {
        planningTasksFile = undefined;
        hidePlanningOverlay();
        ctx.ui.notify("Taskrun planning overlay hidden.", "info");
        return;
      }

      if (command === "start") {
        const tasksFile = rest.join(" ") || defaultTasksFile();
        if (activeChild) {
          ctx.ui.notify("A task run is already active. Use /taskrun stop first.", "warning");
          return;
        }

        try {
          planningTasksFile = undefined;
          hidePlanningOverlay();
          currentRun = createRun(ctx.cwd, tasksFile);
          updateWidget(ctx, currentRun);
          ctx.ui.notify(`Started task run ${currentRun.id}`, "success");
          void runQueue(ctx, currentRun);
        } catch (error) {
          ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
        }
        return;
      }

      if (command === "status") {
        currentRun = loadCurrentRun();
        updateWidget(ctx, currentRun);
        ctx.ui.notify(currentRun ? `Current run: ${currentRun.dir}` : "No active task run.", "info");
        return;
      }

      if (command === "notes") {
        currentRun = loadCurrentRun();
        updateWidget(ctx, currentRun);
        ctx.ui.notify(currentRun ? `Notes: ${currentRun.notesFile}` : "No active task run.", "info");
        return;
      }

      if (command === "stop") {
        stopRequested = true;
        activeChild?.kill("SIGTERM");
        if (currentRun) {
          currentRun.status = "stopped";
          currentRun.latestEvent = "stop requested";
          saveRun(currentRun);
          updateWidget(ctx, currentRun);
        }
        ctx.ui.notify("Stop requested.", "warning");
        return;
      }

      ctx.ui.notify(help(), "info");
    },
  });
}
