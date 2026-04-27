import { type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Markdown, visibleWidth } from "@mariozechner/pi-tui";

const PATCHED = Symbol.for("persistent-code-fence-background:patched");
const CODE_BG = "\x1b[48;2;30;30;46m";
const RESET_BG = "\x1b[49m";

type MarkdownWithPrivate = Markdown & {
  [PATCHED]?: boolean;
  render: (width: number) => string[];
  renderToken: (token: any, width: number, nextTokenType?: string, styleContext?: any) => string[];
};

const ANSI_RE = /\x1b\[[0-?]*[ -/]*[@-~]/g;

function stripAnsi(text: string) {
  return text.replace(ANSI_RE, "");
}

function isFenceLine(line: string) {
  return stripAnsi(line).trimStart().startsWith("```");
}

function applyCodeFenceBg(text: string) {
  // Keep the background active across ANSI resets produced by syntax highlighting.
  return `${CODE_BG}${text.replace(/\x1b\[0m/g, `\x1b[0m${CODE_BG}`).replace(/\x1b\[49m/g, CODE_BG)}${RESET_BG}`;
}

function installCodeFenceBackground() {
  const proto = Markdown.prototype as MarkdownWithPrivate;
  if (proto[PATCHED]) return;

  const originalRender = proto.render;
  const originalRenderToken = proto.renderToken;

  proto.render = function patchedRender(width: number) {
    const lines = originalRender.call(this, width);
    const result: string[] = [];
    let inCodeFence = false;

    for (const line of lines) {
      // Safety net: if pi's built-in renderer still emitted ``` fence lines,
      // hide them here and apply the background to everything between them.
      if (isFenceLine(line)) {
        inCodeFence = !inCodeFence;
        continue;
      }

      if (inCodeFence) {
        const padded = line + " ".repeat(Math.max(0, width - visibleWidth(line)));
        result.push(applyCodeFenceBg(padded));
      } else {
        result.push(line);
      }
    }

    return result;
  };

  proto.renderToken = function patchedRenderToken(token: any, width: number, nextTokenType?: string, styleContext?: any) {
    if (token?.type !== "code") {
      return originalRenderToken.call(this, token, width, nextTokenType, styleContext);
    }

    // Re-render code tokens ourselves instead of post-processing the built-in
    // output, so the opening/closing ``` fence lines are never emitted.
    const markdownTheme = (this as any).theme;
    const indent = markdownTheme.codeBlockIndent ?? "  ";
    const codeLines = markdownTheme.highlightCode
      ? markdownTheme.highlightCode(token.text, token.lang)
      : String(token.text ?? "").split("\n").map((line: string) => markdownTheme.codeBlock(line));

    const renderedCode = codeLines.map((line: string) => {
      const indented = `${indent}${line}`;
      const padded = indented + " ".repeat(Math.max(0, width - visibleWidth(indented)));
      return applyCodeFenceBg(padded);
    });

    if (nextTokenType && nextTokenType !== "space") renderedCode.push("");
    return renderedCode;
  };

  proto[PATCHED] = true;
}

export default function (_pi: ExtensionAPI) {
  installCodeFenceBackground();
}
