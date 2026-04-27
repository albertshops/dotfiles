import { spawn } from "node:child_process";
import { basename } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type TextBlock = { type: "text"; text: string };
type MessageLike = {
  role?: string;
  content?: string | Array<TextBlock | Record<string, unknown>>;
};

const AFPLAY = "/usr/bin/afplay";
const OSASCRIPT = "/usr/bin/osascript";
const PURR_SOUND = "/System/Library/Sounds/Purr.aiff";

function runDetached(command: string, args: string[]) {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });

  child.on("error", () => {
    // Ignore notification/playback errors so the extension never interferes with pi.
  });

  child.unref();
}

function textFromMessage(message: MessageLike): string {
  if (typeof message.content === "string") return message.content;
  if (!Array.isArray(message.content)) return "";

  return message.content
    .filter((block): block is TextBlock => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n");
}

function truncate(text: string, maxLength = 180): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > maxLength ? `${oneLine.slice(0, maxLength - 1)}…` : oneLine;
}

function getPromptText(messages: unknown[]): string {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message): message is MessageLike => {
      return typeof message === "object" && message !== null && (message as MessageLike).role === "user";
    });

  return lastUserMessage ? truncate(textFromMessage(lastUserMessage)) : "Prompt";
}

export default function (pi: ExtensionAPI) {
  pi.on("agent_end", async (event, ctx) => {
    const message = getPromptText(event.messages);
    const title = basename(ctx.cwd) || "pi";

    ctx.ui.notify(message, "success");

    runDetached(OSASCRIPT, [
      "-e",
      `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`,
    ]);
    runDetached(AFPLAY, [PURR_SOUND]);
  });
}
