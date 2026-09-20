import {
	DynamicBorder,
	type ExtensionAPI,
	type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
	Container,
	type Component,
	Loader,
	Text,
	truncateToWidth,
	visibleWidth,
	type TUI,
} from "@earendil-works/pi-tui";

let lastPrompt = "";
let queuedPrompts: string[] = [];
let isWorking = false;

class InlineWorkingIndicator extends Loader {
	constructor(
		tui: TUI,
		spinnerStyle: (value: string) => string,
		messageStyle: (value: string) => string,
	) {
		super(tui, spinnerStyle, messageStyle, "");
	}

	renderInline(width: number): string {
		return truncateToWidth(this.getRenderedIndicator(), width, "");
	}

	dispose(): void {
		this.stop();
	}
}

class DisposableContainer extends Container {
	dispose(): void {
		for (const child of this.children) {
			(child as Component & { dispose?: () => void }).dispose?.();
		}
	}
}

class PromptLine implements Component {
	private readonly indicator?: InlineWorkingIndicator;

	constructor(
		tui: TUI,
		private readonly prompt: string,
		private readonly promptStyle: (value: string) => string,
		spinnerStyle: (value: string) => string,
		messageStyle: (value: string) => string,
		working: boolean,
	) {
		if (working) this.indicator = new InlineWorkingIndicator(tui, spinnerStyle, messageStyle);
	}

	render(width: number): string[] {
		const padding = width >= 3 ? 1 : 0;
		const availableWidth = Math.max(0, width - padding * 2);
		const indicator = this.indicator?.renderInline(availableWidth) ?? "";
		const gap = indicator && this.prompt ? "  " : "";
		const promptWidth = Math.max(0, availableWidth - visibleWidth(indicator) - visibleWidth(gap));
		const prompt = truncateToWidth(this.promptStyle(this.prompt), promptWidth, "…");

		return [`${" ".repeat(padding)}${indicator}${gap}${prompt}`];
	}

	invalidate(): void {
		this.indicator?.invalidate();
	}

	dispose(): void {
		this.indicator?.dispose();
	}
}

function getUserPrompt(message: unknown): string | undefined {
	if (!message || typeof message !== "object") return undefined;

	const candidate = message as {
		role?: string;
		content?: string | Array<{ type?: string; text?: string }>;
	};
	if (candidate.role !== "user") return undefined;

	if (typeof candidate.content === "string") return candidate.content;
	if (!Array.isArray(candidate.content)) return undefined;

	const text = candidate.content
		.filter((part) => part.type === "text" && typeof part.text === "string")
		.map((part) => part.text)
		.join("\n");
	return text || undefined;
}

function updateDisplay(ctx: ExtensionContext): void {
	if (ctx.mode !== "tui") return;

	// Pi's actual header is part of the scrollable transcript, so use a widget
	// to keep the latest prompt visible directly above the editor.
	ctx.ui.setWidget("last-prompt-header", (tui, theme) => {
		const container = new DisposableContainer();
		container.addChild(new DynamicBorder((text: string) => theme.fg("borderMuted", text)));
		container.addChild(
			new PromptLine(
				tui,
				lastPrompt.replace(/\s+/g, " ").trim(),
				(text) => theme.fg("dim", text),
				(text) => theme.fg("accent", text),
				(text) => theme.fg("muted", text),
				isWorking,
			),
		);

		if (queuedPrompts.length > 0) {
			container.addChild(new Text(theme.fg("muted", "Queued:"), 1, 0));
			queuedPrompts.forEach((prompt, index) => {
				container.addChild(new Text(theme.fg("dim", `${index + 1}. ${prompt}`), 2, 0));
			});
		}

		return container;
	});
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		lastPrompt = "";
		queuedPrompts = [];
		isWorking = !ctx.isIdle();
		ctx.ui.setWorkingVisible(false);

		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "message") continue;
			const prompt = getUserPrompt(entry.message);
			if (prompt !== undefined) lastPrompt = prompt;
		}

		updateDisplay(ctx);
	});

	pi.on("input", (event, ctx) => {
		if (event.streamingBehavior === "followUp") {
			queuedPrompts.push(event.text);
		} else {
			lastPrompt = event.text;
		}

		updateDisplay(ctx);
		return { action: "continue" };
	});

	pi.on("message_start", (event, ctx) => {
		const prompt = getUserPrompt(event.message);
		if (prompt === undefined || queuedPrompts[0] !== prompt) return;

		queuedPrompts.shift();
		lastPrompt = prompt;
		updateDisplay(ctx);
	});

	pi.on("agent_start", (_event, ctx) => {
		isWorking = true;
		updateDisplay(ctx);
	});

	pi.on("agent_settled", (_event, ctx) => {
		isWorking = false;
		queuedPrompts = [];
		updateDisplay(ctx);
	});

	pi.on("session_shutdown", (_event, ctx) => {
		ctx.ui.setWorkingVisible(true);
	});
}
