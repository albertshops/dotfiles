import type { Plugin } from "@opencode-ai/plugin";
import { readFile } from "node:fs/promises";

export const NotificationPlugin: Plugin = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  const lastModeBySession = new Map<string, "build" | "plan">();
  const handledPermissionRequests = new Set<string>();
  const handledQuestionRequests = new Set<string>();
  const envPath = process.env.HOME ? `${process.env.HOME}/.config/opencode/.env` : undefined;

  const trackSessionMode = (sessionID: string, mode: string): void => {
    if (mode === "build" || mode === "plan") {
      lastModeBySession.set(sessionID, mode);
    }
  };

  const escapeAppleScriptString = (value: string): string => {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  };

  const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
    if (!value) {
      return fallback;
    }

    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }

    return fallback;
  };

  const parseNumber = (value: string | undefined, fallback: number): number => {
    if (!value) {
      return fallback;
    }

    const parsed = Number(value.trim());
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    if (parsed < 0) {
      return 0;
    }

    if (parsed > 1) {
      return 1;
    }

    return parsed;
  };

  const parseEnvFile = (content: string): Map<string, string> => {
    const entries = new Map<string, string>();

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
      if (!key) {
        continue;
      }

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      entries.set(key, value);
    }

    return entries;
  };

  type NotificationConfig = {
    desktop: boolean;
    sound: boolean;
    telegram: boolean;
    soundFile: string;
    soundVolume: number;
    telegramBotToken?: string;
    telegramChatID?: string;
  };

  const loadNotificationConfig = async (): Promise<NotificationConfig> => {
    const defaults: NotificationConfig = {
      desktop: true,
      sound: true,
      telegram: false,
      soundFile: "/System/Library/Sounds/Purr.aiff",
      soundVolume: 1,
    };

    if (!envPath) {
      return defaults;
    }

    try {
      const content = await readFile(envPath, "utf8");
      const env = parseEnvFile(content);

      return {
        desktop: parseBoolean(env.get("NOTIFY_DESKTOP"), defaults.desktop),
        sound: parseBoolean(env.get("NOTIFY_SOUND"), defaults.sound),
        telegram: parseBoolean(env.get("NOTIFY_TELEGRAM"), defaults.telegram),
        soundFile: env.get("NOTIFY_SOUND_FILE") || defaults.soundFile,
        soundVolume: parseNumber(env.get("NOTIFY_SOUND_VOLUME"), defaults.soundVolume),
        telegramBotToken: env.get("TELEGRAM_BOT_TOKEN"),
        telegramChatID: env.get("TELEGRAM_CHAT_ID"),
      };
    } catch {
      return defaults;
    }
  };

  const showNotification = async (message: string): Promise<void> => {
    const script = `display notification "${escapeAppleScriptString(message)}" with title "opencode"`;
    await $`osascript -e ${script}`;
  };

  const playAlert = async (soundFile: string, soundVolume: number): Promise<void> => {
    await $`afplay --volume ${soundVolume.toString()} ${soundFile}`;
  };

  const sendTelegramText = async (message: string, botToken: string, chatID: string): Promise<void> => {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        chat_id: chatID,
        text: `opencode: ${message}`,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Telegram request failed with ${response.status}`);
    }
  };

  const notify = async (message: string): Promise<void> => {
    const config = await loadNotificationConfig();

    if (config.desktop) {
      try {
        await showNotification(message);
      } catch {
      }
    }

    if (config.sound) {
      try {
        await playAlert(config.soundFile, config.soundVolume);
      } catch {
      }
    }

    if (config.telegram && config.telegramBotToken && config.telegramChatID) {
      try {
        await sendTelegramText(message, config.telegramBotToken, config.telegramChatID);
      } catch {
      }
    }
  };

  return {
    event: async ({ event }) => {
      if (event.type === "command.executed") {
        trackSessionMode(event.properties.sessionID, event.properties.name);
        return;
      }

      if (event.type === "message.updated") {
        const message = event.properties.info;
        if (message.role === "assistant") {
          trackSessionMode(event.properties.sessionID, message.mode);
        }
        return;
      }

      if (event.type === "session.idle") {
        const mode = lastModeBySession.get(event.properties.sessionID);
        if (!mode) {
          return;
        }

        lastModeBySession.delete(event.properties.sessionID);
        if (mode === "build") {
          await notify("Build finished");
          return;
        }

        await notify("Plan finished");
        return;
      }

      if (event.type === "permission.asked") {
        if (handledPermissionRequests.has(event.properties.id)) {
          return;
        }

        handledPermissionRequests.add(event.properties.id);
        await notify("Permission required");
        return;
      }

      if (event.type === "permission.replied") {
        handledPermissionRequests.delete(event.properties.requestID);
        return;
      }

      if (event.type === "question.asked") {
        if (handledQuestionRequests.has(event.properties.id)) {
          return;
        }

        handledQuestionRequests.add(event.properties.id);
        await notify("Action required");
        return;
      }

      if (event.type === "question.replied" || event.type === "question.rejected") {
        handledQuestionRequests.delete(event.properties.requestID);
        return;
      }

      if (event.type === "session.error") {
        await notify("Session error");
      }
    },
  };
};
