import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { complete, type UserMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth, type Component, type OverlayHandle, type TUI } from "@mariozechner/pi-tui";

const WIDGET_ID = "sprint";
const ROOT_DIR = ".pi/sprints";
const CURRENT_FILE = join(ROOT_DIR, "current.json");

const NOTES_SUMMARY_SYSTEM_PROMPT = `You summarize sprint handoff notes for pi.

Create a concise markdown summary that helps the user understand the sprint result without reading the raw notes. Include:
- Outcome / what was completed
- Important files changed or inspected
- Key decisions or findings
- Risks, unknowns, or follow-up work

Do not quote the full notes. Prefer short bullets. If the notes are sparse, say so clearly.`;

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
  summaryFile?: string;
  summaryStatus?: "pending" | "done" | "failed";
  summaryError?: string;
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
let runOverlayHandle: OverlayHandle | undefined;
let runOverlayTui: TUI | undefined;
let runOverlayInterval: NodeJS.Timeout | undefined;
let runOutputLines: string[] = [];

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

function safeReadText(path: string) {
  try {
    return existsSync(path) ? readText(path) : `(missing: ${path})`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function linesFromText(text: string) {
  const lines = text.trimEnd().split("\n");
  return lines.length ? lines : [""];
}

function formatPaneLine(line: string, width: number) {
  return padToWidth(truncateToWidth(line, width), width);
}

function horizontalPaneRule(width: number) {
  if (width <= 0) return "";
  if (width === 1) return "─";
  return `├${"─".repeat(Math.max(0, width - 2))}┤`;
}

function taskStatusLabel(status: TaskStatus) {
  if (status === "running") return "RUN";
  if (status === "done") return "DONE";
  if (status === "failed") return "FAIL";
  if (status === "skipped") return "SKIP";
  return "PEND";
}

function summaryFileForRun(run: RunState) {
  return run.summaryFile || join(run.dir, "summary.md");
}

function buildNotesSummaryPrompt(run: RunState, notes: string) {
  const taskResults = run.tasks.map((task) => `- ${task.id} [${task.status}] ${task.title}`).join("\n");
  return `Sprint: ${run.id}\nStatus: ${run.status}\n\nTask results:\n${taskResults}\n\nRaw sprint handoff notes to summarize:\n\n<notes>\n${notes}\n</notes>`;
}

function notesSummaryLines(run: RunState) {
  const summaryFile = summaryFileForRun(run);
  if (run.summaryStatus === "done" && existsSync(summaryFile)) {
    return linesFromText(readText(summaryFile));
  }

  if (run.summaryStatus === "pending") {
    return ["Generating sprint notes summary with pi...", `Source notes: ${run.notesFile}`];
  }

  if (run.summaryStatus === "failed") {
    return [
      "Could not generate sprint notes summary.",
      ...(run.summaryError ? [`Error: ${run.summaryError}`] : []),
      `Raw notes remain at: ${run.notesFile}`,
    ];
  }

  return ["Sprint notes summary has not been generated yet.", `Raw notes: ${run.notesFile}`];
}

function buildSprintSummaryLines(run: RunState) {
  const done = run.tasks.filter((task) => task.status === "done").length;
  return [
    `Sprint complete: ${run.id}`,
    `Status: ${run.status}`,
    `Tasks complete: ${done}/${run.tasks.length}`,
    ...(run.latestEvent ? [`Latest: ${run.latestEvent}`] : []),
    "",
    "Task results:",
    ...run.tasks.map((task) => `- ${task.id} [${taskStatusLabel(task.status)}] ${task.title}`),
    "",
    `Sprint notes summary (${summaryFileForRun(run)}):`,
    ...notesSummaryLines(run),
  ];
}

class RunOverlay implements Component {
  constructor(private tui: TUI) {}

  invalidate() {}

  render(width: number): string[] {
    const run = currentRun;
    if (!run) return [];

    const terminalRows = this.tui.terminal.rows || 24;
    const maxRows = Math.max(10, Math.min(terminalRows - 2, Math.floor(terminalRows * 0.9)));
    const contentRows = Math.max(1, maxRows - 2);
    const innerWidth = Math.max(1, width - 2);
    const separatorWidth = innerWidth >= 24 ? 1 : 0;
    let rightWidth = separatorWidth ? Math.max(24, Math.floor(innerWidth * 0.38)) : 0;
    let leftWidth = innerWidth - separatorWidth - rightWidth;

    if (separatorWidth && leftWidth < 20) {
      leftWidth = Math.max(1, Math.floor((innerWidth - separatorWidth) * 0.6));
      rightWidth = Math.max(1, innerWidth - separatorWidth - leftWidth);
    }

    const done = run.tasks.filter((task) => task.status === "done").length;
    const title = truncateToWidth(` sprint ${run.status}: ${basename(run.dir)} (${done}/${run.tasks.length}) `, Math.max(1, width - 2), "");
    const topRule = Math.max(0, width - 2 - visibleWidth(title));
    const lines = [`╭${title}${"─".repeat(topRule)}╮`];

    const outputBody = run.status === "done"
      ? buildSprintSummaryLines(run)
      : runOutputLines.length ? runOutputLines.slice(-(contentRows - 1)) : ["Waiting for current task output..."];
    const outputPane = [run.status === "done" ? " sprint summary " : " pi output ", ...outputBody];

    const tasksPane = [
      " tasks + statuses ",
      `run: ${run.status} (${done}/${run.tasks.length})`,
      ...(run.latestEvent ? [`latest: ${run.latestEvent}`] : []),
      ...run.tasks.map((task) => `${task.id} [${taskStatusLabel(task.status)}] ${task.title}`),
    ];

    const notesPane = run.status === "done"
      ? [" notes summary ", ...notesSummaryLines(run)]
      : [" handover notes ", ...linesFromText(safeReadText(run.notesFile))];
    const topRightRows = separatorWidth ? Math.max(3, Math.min(contentRows - 3, Math.floor(contentRows * 0.45))) : 0;

    for (let row = 0; row < contentRows; row++) {
      const left = formatPaneLine(outputPane[row] ?? "", leftWidth);
      if (!separatorWidth) {
        lines.push(`│${left}│`);
        continue;
      }

      let right: string;
      if (row < topRightRows) right = formatPaneLine(tasksPane[row] ?? "", rightWidth);
      else if (row === topRightRows) right = horizontalPaneRule(rightWidth);
      else right = formatPaneLine(notesPane[row - topRightRows - 1] ?? "", rightWidth);

      lines.push(`│${left}│${right}│`);
    }

    lines.push(`╰${"─".repeat(Math.max(0, width - 2))}╯`);
    return lines;
  }
}

function refreshRunOverlay() {
  runOverlayTui?.requestRender();
}

function showRunOverlay(ctx: ExtensionContext, run: RunState) {
  currentRun = run;

  if (!runOverlayInterval) {
    runOverlayInterval = setInterval(refreshRunOverlay, 1000);
  }

  if (runOverlayHandle) {
    runOverlayHandle.setHidden(false);
    refreshRunOverlay();
    return;
  }

  void ctx.ui.custom((tui) => {
    runOverlayTui = tui;
    return new RunOverlay(tui);
  }, {
    overlay: true,
    overlayOptions: {
      anchor: "center",
      width: "90%",
      maxHeight: "90%",
      margin: 1,
      nonCapturing: true,
    },
    onHandle: (handle) => {
      runOverlayHandle = handle;
    },
  });
}

function hideRunOverlay() {
  if (runOverlayInterval) {
    clearInterval(runOverlayInterval);
    runOverlayInterval = undefined;
  }
  runOverlayHandle?.hide();
  runOverlayHandle = undefined;
  runOverlayTui = undefined;
}

function addRunOutput(text: string) {
  const lines = text.split("\n").filter(Boolean);
  if (lines.length === 0) return;
  runOutputLines.push(...lines);
  if (runOutputLines.length > 500) runOutputLines = runOutputLines.slice(-500);
  refreshRunOverlay();
}

function enterPlanningMode(ctx: ExtensionContext, tasksFile: string) {
  planningTasksFile = resolve(ctx.cwd, tasksFile);
  showPlanningOverlay(ctx);
  refreshPlanningOverlay();
}

function buildPlanningPrompt(userText: string) {
  return `We are in sprint planning mode.

The user is having a back-and-forth planning conversation with you. Based on their latest message, update this markdown task file in-place:

${planningTasksFile}

Keep the file as a clear markdown checklist for /sprint start. Use unchecked checkbox lines for runnable tasks, e.g.:
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
  refreshRunOverlay();
}

function updateWidget(ctx: ExtensionContext, _run?: RunState) {
  ctx.ui.setWidget(WIDGET_ID, undefined);
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
  const summaryFile = join(dir, "summary.md");
  writeFileSync(tasksFile, markdown, "utf8");
  writeFileSync(notesFile, `# Sprint Notes\n\nSprint: ${id}\nSource tasks: ${sourceTasksFile}\n\n`, "utf8");

  const run: RunState = {
    id,
    cwd,
    dir,
    sourceTasksFile,
    tasksFile,
    notesFile,
    summaryFile,
    status: "idle",
    tasks,
    createdAt: now(),
    updatedAt: now(),
  };

  saveRun(run);
  return run;
}

async function generateNotesSummary(ctx: ExtensionContext, run: RunState) {
  const summaryFile = summaryFileForRun(run);
  run.summaryFile = summaryFile;
  run.summaryStatus = "pending";
  delete run.summaryError;
  run.latestEvent = "generating sprint notes summary";
  saveRun(run);
  refreshRunOverlay();
  updateWidget(ctx, run);

  try {
    if (!ctx.model) throw new Error("No model selected");

    const auth = await ctx.modelRegistry.getApiKeyAndHeaders(ctx.model);
    if (!auth.ok) throw new Error(auth.error);
    if (!auth.apiKey) throw new Error(`No API key for ${ctx.model.provider}`);

    const notes = safeReadText(run.notesFile);
    const userMessage: UserMessage = {
      role: "user",
      content: [{ type: "text", text: buildNotesSummaryPrompt(run, notes) }],
      timestamp: Date.now(),
    };

    const response = await complete(
      ctx.model,
      { systemPrompt: NOTES_SUMMARY_SYSTEM_PROMPT, messages: [userMessage] },
      { apiKey: auth.apiKey, headers: auth.headers },
    );

    if (response.stopReason === "aborted") throw new Error("Summary generation aborted");

    const summary = response.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("\n")
      .trim();

    if (!summary) throw new Error("Summary generation returned no text");

    writeFileSync(summaryFile, `${summary}\n`, "utf8");
    run.summaryStatus = "done";
    delete run.summaryError;
    run.latestEvent = "sprint notes summarized";
  } catch (error) {
    run.summaryStatus = "failed";
    run.summaryError = error instanceof Error ? error.message : String(error);
    run.latestEvent = "sprint notes summary failed";
  }

  saveRun(run);
  refreshRunOverlay();
  updateWidget(ctx, run);
}

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part && typeof part.text === "string") return part.text;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function describeChildEvent(event: any, taskId: string): string | undefined {
  if (event.type === "tool_execution_start") {
    const args = event.args ? ` ${JSON.stringify(event.args).slice(0, 500)}` : "";
    return `> ${event.toolName}${args}`;
  }

  if (event.type === "tool_execution_update") {
    const text = textFromContent(event.partialResult?.content);
    return text ? `${event.toolName}: ${text}` : undefined;
  }

  if (event.type === "tool_execution_end") {
    const text = textFromContent(event.result?.content);
    return text ? `${event.toolName} ${event.isError ? "failed" : "done"}: ${text}` : `${event.toolName} ${event.isError ? "failed" : "done"}`;
  }

  if (event.type === "message_end" && event.message?.role === "assistant") {
    const text = textFromContent(event.message.content);
    return text ? `assistant:\n${text}` : undefined;
  }

  if (event.type === "auto_retry_start") return `retry ${event.attempt}/${event.maxAttempts}: ${event.errorMessage}`;
  if (event.type === "auto_retry_end" && !event.success) return `retry failed: ${event.finalError ?? "unknown error"}`;
  if (event.type === "compaction_start") return "compaction started";
  if (event.type === "compaction_end") return `compaction ${event.aborted ? "aborted" : "ended"}`;
  if (event.type === "agent_end") return `${taskId}: agent finished`;
  return undefined;
}

function buildPrompt(run: RunState, task: Task) {
  const allTasks = run.tasks.map((t) => `${t.id} [${t.status}] ${t.title}`).join("\n");
  const notes = existsSync(run.notesFile) ? readText(run.notesFile) : "";

  return `You are a subtask worker in a larger pi sprint.\n\nOverall sprint task list:\n${allTasks}\n\nCurrent subtask:\n${task.id}: ${task.title}\n\nShared handoff notes so far:\n${notes || "(none yet)"}\n\nRules:\n- Work only on the current subtask.\n- You may inspect and modify files as needed for this subtask.\n- Do not start later subtasks unless they are necessary to complete this one.\n- Before finishing, append handoff notes to this file: ${run.notesFile}\n- Also write a structured JSON handoff to this exact file: ${task.handoffFile}\n\nThe JSON handoff should have this shape:\n{\n  "taskId": "${task.id}",\n  "status": "done",\n  "summary": "...",\n  "filesTouched": ["..."],\n  "notesForNextTask": ["..."],\n  "risksOrUnknowns": ["..."]\n}\n\nHandoff notes should include what changed, what you learned, files touched, risks/unknowns, and recommendations for the next task.\n`; 
}

function runChildPi(run: RunState, task: Task, ctx: ExtensionContext): Promise<number | null> {
  return new Promise((resolve) => {
    task.sessionFile = join(run.dir, "sessions", `${task.id}.jsonl`);
    task.handoffFile = join(run.dir, "handoffs", `${task.id}.json`);
    const prompt = buildPrompt(run, task);
    runOutputLines = [`${task.id}: ${task.title}`, ""];
    refreshRunOverlay();

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
          const output = describeChildEvent(event, task.id);
          if (output) addRunOutput(output);

          if (event.type === "tool_execution_start") run.latestEvent = `${task.id}: tool ${event.toolName}`;
          else if (event.type === "tool_execution_end") run.latestEvent = `${task.id}: tool ${event.toolName} ${event.isError ? "failed" : "done"}`;
          else if (event.type === "turn_start") run.latestEvent = `${task.id}: thinking`;
          else if (event.type === "agent_end") run.latestEvent = `${task.id}: finished`;
          if (run.latestEvent) updateWidget(ctx, run);
        } catch {
          addRunOutput(line);
        }
      }
    });

    activeChild.stderr.on("data", (chunk) => {
      const text = chunk.toString().trim();
      if (text) {
        run.latestEvent = `${task.id}: ${text.split("\n").at(-1)}`;
        addRunOutput(text);
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
  showRunOverlay(ctx, run);
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
  refreshRunOverlay();
  updateWidget(ctx, run);

  if (run.status === "done") {
    await generateNotesSummary(ctx, run);
  }

  ctx.ui.notify(`Sprint ${run.status}: ${run.id}`, run.status === "done" ? "success" : run.status === "failed" ? "error" : "info");
}

function help() {
  return [
    "sprint commands:",
    "  /sprint                    create/open TASKS.md, enter planning mode, show overlay",
    "  /sprint hide               hide sprint planning/run overlays",
    "  /sprint start              run unchecked markdown checkbox tasks",
    "  /sprint stop               stop the active child pi process",
  ].join("\n");
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    currentRun = loadCurrentRun();
    if (currentRun) updateWidget(ctx, currentRun);
  });

  pi.on("session_shutdown", () => {
    hidePlanningOverlay();
    hideRunOverlay();
  });

  pi.on("input", (event) => {
    if (event.source === "extension") return { action: "continue" as const };
    if (!planningTasksFile) return { action: "continue" as const };
    if (event.text.trimStart().startsWith("/")) return { action: "continue" as const };

    refreshPlanningOverlay();
    return { action: "transform" as const, text: buildPlanningPrompt(event.text), images: event.images };
  });

  pi.registerCommand("sprint", {
    description: "Run a markdown task list as a sprint of sequential child pi sessions with shared handoff notes",
    handler: async (args, ctx) => {
      const [command, ...rest] = args.trim().split(/\s+/).filter(Boolean);

      if (command === "help") {
        ctx.ui.notify(help(), "info");
        return;
      }

      const subcommands = new Set(["hide", "start", "stop"]);
      if (!command) {
        const file = join(ROOT_DIR, "TASKS.md");
        const absoluteFile = resolve(ctx.cwd, file);
        ensureDir(join(absoluteFile, ".."));
        if (existsSync(absoluteFile)) {
          if (readText(absoluteFile).length > 0) {
            writeFileSync(absoluteFile, "", "utf8");
          }
        } else {
          writeFileSync(absoluteFile, `# Sprint\n\n## Goal\n\nDescribe the goal here.\n\n## Tasks\n\n- [ ] First concrete task\n- [ ] Second concrete task\n- [ ] Final verification\n`, "utf8");
        }
        enterPlanningMode(ctx, file);
        ctx.ui.notify(`Planning mode active: ${absoluteFile}`, "success");
        return;
      }

      if (!subcommands.has(command)) {
        ctx.ui.notify(help(), "info");
        return;
      }

      if (command === "hide") {
        planningTasksFile = undefined;
        hidePlanningOverlay();
        hideRunOverlay();
        ctx.ui.notify("Sprint overlays hidden.", "info");
        return;
      }

      if (command === "start") {
        if (rest.length > 0) {
          ctx.ui.notify("/sprint start does not accept a task file path. Use /sprint to edit the default TASKS.md.", "warning");
          return;
        }
        const tasksFile = defaultTasksFile();
        if (activeChild) {
          ctx.ui.notify("A sprint is already active. Use /sprint stop first.", "warning");
          return;
        }

        try {
          planningTasksFile = undefined;
          hidePlanningOverlay();
          currentRun = createRun(ctx.cwd, tasksFile);
          ctx.ui.setWidget(WIDGET_ID, undefined);
          ctx.ui.notify(`Started sprint ${currentRun.id}`, "success");
          void runQueue(ctx, currentRun);
        } catch (error) {
          ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
        }
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
