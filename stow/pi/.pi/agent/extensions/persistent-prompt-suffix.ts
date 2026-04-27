import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { CustomEditor, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { CURSOR_MARKER, Key, matchesKey, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

type SuffixState = {
  cwd: string;
  enabled: boolean;
  text: string;
  focus: "main" | "suffix";
};

type SavedState = Record<string, { enabled?: boolean; text?: string }>;

const STORE_PATH = join(homedir(), ".pi", "agent", "persistent-prompt-suffixes.json");
const STATUS_ID = "persistent-prompt-suffix";

const state: SuffixState = {
  cwd: "",
  enabled: false,
  text: "",
  focus: "main",
};

let currentEditor: PersistentSuffixEditor | undefined;
let currentCtx: any;

function loadStore(): SavedState {
  try {
    if (!existsSync(STORE_PATH)) return {};
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as SavedState;
  } catch {
    return {};
  }
}

function saveStore(store: SavedState) {
  try {
    writeFileSync(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  } catch {
    // Ignore persistence errors so the extension never interferes with pi.
  }
}

function loadStateForCwd(cwd: string) {
  const saved = loadStore()[cwd];
  state.cwd = cwd;
  state.enabled = saved?.enabled ?? false;
  state.text = saved?.text ?? "";
  state.focus = "main";
}

function persistState() {
  if (!state.cwd) return;
  const store = loadStore();
  store[state.cwd] = { enabled: state.enabled, text: state.text };
  saveStore(store);
}

function updateStatus() {
  if (!currentCtx) return;
  if (!state.enabled) {
    currentCtx.ui.setStatus(STATUS_ID, undefined);
    return;
  }

  const suffix = state.text.trim() ? `suffix: ${truncateForStatus(state.text)}` : "suffix: empty";
  currentCtx.ui.setStatus(STATUS_ID, suffix);
}

function truncateForStatus(text: string) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 32 ? `${oneLine.slice(0, 31)}…` : oneLine;
}

function refreshUi() {
  updateStatus();
  currentEditor?.refresh();
}

function appendSuffix(prompt: string) {
  if (!state.enabled || !state.text.trim()) return prompt;
  return `${prompt.trimEnd()}\n\n${state.text}`;
}

function isPrintable(data: string) {
  return data.length > 0 && !data.startsWith("\x1b") && !/[\x00-\x08\x0b-\x1f\x7f]/.test(data);
}

class PersistentSuffixEditor extends CustomEditor {
  private suffixCursor = state.text.length;
  private preferredColumn: number | undefined;

  setSuffixFocus(focused: boolean) {
    state.focus = focused ? "suffix" : "main";
    this.clampCursor();
    this.refresh();
  }

  refresh() {
    this.invalidate();
    this.tui.requestRender();
  }

  override handleInput(data: string): void {
    if (!state.enabled) {
      super.handleInput(data);
      return;
    }

    if (matchesKey(data, Key.ctrl("s"))) {
      this.setSuffixFocus(state.focus !== "suffix");
      return;
    }

    if (state.focus !== "suffix") {
      super.handleInput(data);
      return;
    }

    if (matchesKey(data, Key.escape)) {
      this.setSuffixFocus(false);
      return;
    }

    if (matchesKey(data, Key.enter)) {
      this.insertSuffixText("\n");
      return;
    }

    if (matchesKey(data, Key.left)) {
      this.suffixCursor = Math.max(0, this.suffixCursor - 1);
      this.preferredColumn = undefined;
      this.refresh();
      return;
    }

    if (matchesKey(data, Key.right)) {
      this.suffixCursor = Math.min(state.text.length, this.suffixCursor + 1);
      this.preferredColumn = undefined;
      this.refresh();
      return;
    }

    if (matchesKey(data, Key.up)) {
      this.moveSuffixCursorVertically(-1);
      return;
    }

    if (matchesKey(data, Key.down)) {
      this.moveSuffixCursorVertically(1);
      return;
    }

    if (matchesKey(data, Key.home)) {
      this.suffixCursor = this.currentLineStart();
      this.preferredColumn = undefined;
      this.refresh();
      return;
    }

    if (matchesKey(data, Key.end)) {
      this.suffixCursor = this.currentLineEnd();
      this.preferredColumn = undefined;
      this.refresh();
      return;
    }

    if (matchesKey(data, Key.backspace)) {
      if (this.suffixCursor > 0) {
        state.text = state.text.slice(0, this.suffixCursor - 1) + state.text.slice(this.suffixCursor);
        this.suffixCursor--;
        this.preferredColumn = undefined;
        persistState();
        refreshUi();
      }
      return;
    }

    if (matchesKey(data, Key.delete)) {
      if (this.suffixCursor < state.text.length) {
        state.text = state.text.slice(0, this.suffixCursor) + state.text.slice(this.suffixCursor + 1);
        this.preferredColumn = undefined;
        persistState();
        refreshUi();
      }
      return;
    }

    if (isPrintable(data)) {
      this.insertSuffixText(data);
    }
  }

  override render(width: number): string[] {
    const wasFocused = this.focused;

    if (state.enabled && state.focus === "suffix") this.focused = false;

    const lines = super.render(width);

    this.focused = wasFocused;

    if (!state.enabled) return lines;

    this.clampCursor();
    lines.push(...this.renderSuffixInput(width));
    lines.push(truncateToWidth("  ctrl+s edit suffix • enter newline • esc return to main prompt • /suffix toggles", width));
    return lines;
  }

  private insertSuffixText(text: string) {
    const normalized = text.replace(/\r\n?/g, "\n").replace(/\t/g, "    ");
    state.text = state.text.slice(0, this.suffixCursor) + normalized + state.text.slice(this.suffixCursor);
    this.suffixCursor += normalized.length;
    this.preferredColumn = undefined;
    persistState();
    refreshUi();
  }

  private clampCursor() {
    this.suffixCursor = Math.max(0, Math.min(this.suffixCursor, state.text.length));
  }

  private suffixLines() {
    return state.text.split("\n");
  }

  private cursorPosition() {
    this.clampCursor();
    const beforeCursor = state.text.slice(0, this.suffixCursor);
    const lines = beforeCursor.split("\n");
    return { line: lines.length - 1, column: lines[lines.length - 1]?.length ?? 0 };
  }

  private indexForLineColumn(targetLine: number, targetColumn: number) {
    const lines = this.suffixLines();
    const line = Math.max(0, Math.min(targetLine, lines.length - 1));
    const column = Math.max(0, Math.min(targetColumn, lines[line]?.length ?? 0));
    let index = 0;
    for (let i = 0; i < line; i++) index += (lines[i]?.length ?? 0) + 1;
    return index + column;
  }

  private currentLineStart() {
    const { line } = this.cursorPosition();
    return this.indexForLineColumn(line, 0);
  }

  private currentLineEnd() {
    const { line } = this.cursorPosition();
    return this.indexForLineColumn(line, this.suffixLines()[line]?.length ?? 0);
  }

  private moveSuffixCursorVertically(direction: -1 | 1) {
    const { line, column } = this.cursorPosition();
    const targetLine = line + direction;
    const lines = this.suffixLines();
    if (targetLine < 0 || targetLine >= lines.length) return;

    const preferredColumn = this.preferredColumn ?? column;
    this.preferredColumn = preferredColumn;
    this.suffixCursor = this.indexForLineColumn(targetLine, preferredColumn);
    this.refresh();
  }

  private renderSuffixInput(width: number): string[] {
    const active = state.focus === "suffix";
    const firstPrefix = active ? " suffix › " : " suffix · ";
    const nextPrefix = "        │ ";
    const lines = state.text.length > 0 ? this.suffixLines() : [""];
    const cursor = this.cursorPosition();

    if (!active && state.text.length === 0) {
      return [truncateToWidth(`${firstPrefix}persistent prompt suffix`, width)];
    }

    return lines.map((line, index) => {
      const prefix = index === 0 ? firstPrefix : nextPrefix;
      const contentWidth = Math.max(1, width - visibleWidth(prefix));

      if (!active || index !== cursor.line) {
        return truncateToWidth(prefix + (line || (active ? "" : " ")), width);
      }

      const start = Math.max(0, cursor.column - contentWidth + 1);
      const visibleText = line.slice(start, start + contentWidth);
      const cursorInVisible = cursor.column - start;
      const before = visibleText.slice(0, cursorInVisible);
      const atCursor = visibleText[cursorInVisible] ?? " ";
      const after = visibleText.slice(cursorInVisible + 1);
      return `${prefix}${before}${CURSOR_MARKER}\x1b[7m${atCursor}\x1b[27m${after}`;
    });
  }
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    loadStateForCwd(ctx.cwd);
    currentCtx = ctx;
    updateStatus();

    ctx.ui.setEditorComponent((tui, theme, keybindings) => {
      currentEditor = new PersistentSuffixEditor(tui, theme, keybindings);
      return currentEditor;
    });

  });

  pi.on("session_shutdown", () => {
    currentEditor = undefined;
  });

  pi.on("input", (event) => {
    if (event.source === "extension") return { action: "continue" as const };
    if (event.text.trimStart().startsWith("/")) return { action: "continue" as const };
    if (!state.enabled || !state.text.trim()) return { action: "continue" as const };

    return { action: "transform" as const, text: appendSuffix(event.text), images: event.images };
  });

  pi.registerCommand("suffix", {
    description: "Toggle/edit a persistent prompt suffix appended to every prompt",
    handler: async (args, ctx) => {
      const value = args.trim();

      if (value === "on") {
        state.enabled = true;
        state.focus = "main";
      } else if (value === "off") {
        state.enabled = false;
        state.focus = "main";
      } else if (value === "clear") {
        state.text = "";
        state.enabled = true;
        state.focus = "suffix";
        currentEditor?.setSuffixFocus(true);
      } else if (value === "edit") {
        state.enabled = true;
        currentEditor?.setSuffixFocus(true);
      } else if (value.length > 0) {
        state.text = value;
        state.enabled = true;
        state.focus = "main";
      } else {
        state.enabled = !state.enabled;
        state.focus = state.enabled ? "suffix" : "main";
        if (state.enabled) currentEditor?.setSuffixFocus(true);
      }

      persistState();
      currentCtx = ctx;
      refreshUi();

      const status = state.enabled ? "enabled" : "disabled";
      ctx.ui.notify(`Persistent prompt suffix ${status}.`, "info");
    },
  });
}
