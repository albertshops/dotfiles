import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	truncateHead,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const WORKER_PROMPT = `You are a fresh worker agent operating in an isolated context.

Work autonomously on only the delegated task in the requested repository. Inspect the repository and its instructions before editing. Preserve unrelated changes and avoid unrelated refactors or formatting churn.

Implement the task, run focused and repository-standard validation as appropriate, inspect the final diff, and create exactly one concise commit containing only the task's intended changes.

Do not push, merge, force-push, rewrite history, deploy, release, or create or close pull requests unless the task explicitly authorizes it.

Stop without committing if you encounter an external blocker, an unapproved product, scope, or architecture decision, unsafe repository state, failed validation, or uncertainty about satisfying the acceptance criteria.

Return a structured report containing:
- outcome: completed, blocked, or incomplete;
- commit hash, commit message, and changed files when completed;
- exact validation commands and results;
- remaining risks or work; and
- the reason for any non-completed outcome.`;

interface WorkerDetails {
	agent: "worker";
	cwd: string;
	model?: string;
	thinkingLevel?: string;
	exitCode: number | null;
	stopReason?: string;
	turns: number;
	stderr: string;
	fullOutputPath?: string;
}

interface AssistantMessage {
	role?: string;
	content?: Array<{ type?: string; text?: string }>;
	stopReason?: string;
	errorMessage?: string;
}

function getPiInvocation(args: string[]): { command: string; args: string[] } {
	const currentScript = process.argv[1];
	const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
	if (currentScript && !isBunVirtualScript && fs.existsSync(currentScript)) {
		return { command: process.execPath, args: [currentScript, ...args] };
	}

	const executable = path.basename(process.execPath).toLowerCase();
	if (!/^(node|bun)(\.exe)?$/.test(executable)) {
		return { command: process.execPath, args };
	}

	return { command: "pi", args };
}

function textFromMessage(message: AssistantMessage): string {
	if (message.role !== "assistant" || !Array.isArray(message.content)) return "";
	return message.content
		.filter((part) => part.type === "text" && typeof part.text === "string")
		.map((part) => part.text)
		.join("\n");
}

function saveFullOutput(output: string): string {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pi-worker-output-"));
	const outputPath = path.join(directory, "report.md");
	fs.writeFileSync(outputPath, output, { encoding: "utf8", mode: 0o600 });
	return outputPath;
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "subagent",
		label: "Fresh Worker",
		description:
			"Run exactly one fresh worker agent in an isolated Pi process. Supports only single mode with agent=worker. Output is limited to 50KB or 2000 lines; full truncated reports are saved to a temporary file.",
		promptSnippet: "Delegate one implementation task to a fresh isolated worker agent",
		promptGuidelines: [
			"Use subagent only in single mode with agent=worker, one task per invocation, and the target repository as cwd.",
		],
		parameters: Type.Object({
			agent: Type.String({ description: 'Agent name; must be "worker"' }),
			task: Type.String({ description: "Complete self-contained task prompt for the worker" }),
			cwd: Type.Optional(Type.String({ description: "Repository working directory; defaults to the current directory" })),
		}),

		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			if (params.agent !== "worker") {
				throw new Error(`Unknown agent "${params.agent}". This extension provides only "worker".`);
			}

			const cwd = path.resolve(ctx.cwd, params.cwd ?? ctx.cwd);
			let stat: fs.Stats;
			try {
				stat = fs.statSync(cwd);
			} catch {
				throw new Error(`Worker cwd does not exist: ${cwd}`);
			}
			if (!stat.isDirectory()) throw new Error(`Worker cwd is not a directory: ${cwd}`);

			const model = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : undefined;
			const args = ["--mode", "json", "--print", "--no-session"];
			if (model) args.push("--model", model);
			if (ctx.thinkingLevel) args.push("--thinking", ctx.thinkingLevel);
			args.push("--append-system-prompt", WORKER_PROMPT, `Task: ${params.task}`);

			const details: WorkerDetails = {
				agent: "worker",
				cwd,
				model,
				thinkingLevel: ctx.thinkingLevel,
				exitCode: null,
				turns: 0,
				stderr: "",
			};
			let finalOutput = "";
			let errorMessage = "";
			let stdoutBuffer = "";
			let aborted = false;

			onUpdate?.({
				content: [{ type: "text", text: `Starting fresh worker in ${cwd}...` }],
				details: { ...details },
			});

			const invocation = getPiInvocation(args);
			const exitCode = await new Promise<number>((resolve, reject) => {
				const child = spawn(invocation.command, invocation.args, {
					cwd,
					shell: false,
					stdio: ["ignore", "pipe", "pipe"],
				});

				const processLine = (line: string) => {
					if (!line.trim()) return;
					let event: { type?: string; message?: AssistantMessage };
					try {
						event = JSON.parse(line);
					} catch {
						return;
					}
					if (event.type !== "message_end" || !event.message || event.message.role !== "assistant") return;

					details.turns += 1;
					const output = textFromMessage(event.message);
					if (output) finalOutput = output;
					if (event.message.stopReason) details.stopReason = event.message.stopReason;
					if (event.message.errorMessage) errorMessage = event.message.errorMessage;
					onUpdate?.({
						content: [{ type: "text", text: finalOutput || `Worker turn ${details.turns} completed...` }],
						details: { ...details },
					});
				};

				child.stdout.on("data", (chunk) => {
					stdoutBuffer += chunk.toString();
					const lines = stdoutBuffer.split("\n");
					stdoutBuffer = lines.pop() ?? "";
					for (const line of lines) processLine(line);
				});
				child.stderr.on("data", (chunk) => {
					details.stderr += chunk.toString();
				});

				const abort = () => {
					aborted = true;
					child.kill("SIGTERM");
					setTimeout(() => {
						if (child.exitCode === null) child.kill("SIGKILL");
					}, 5000).unref();
				};
				if (signal?.aborted) abort();
				else signal?.addEventListener("abort", abort, { once: true });

				child.once("error", reject);
				child.once("close", (code) => {
					signal?.removeEventListener("abort", abort);
					if (stdoutBuffer.trim()) processLine(stdoutBuffer);
					resolve(code ?? 1);
				});
			});

			details.exitCode = exitCode;
			if (aborted) throw new Error("Fresh worker was cancelled.");
			if (exitCode !== 0 || details.stopReason === "error" || details.stopReason === "aborted") {
				const reason = errorMessage || details.stderr.trim() || finalOutput || `worker exited with code ${exitCode}`;
				throw new Error(`Fresh worker failed: ${reason}`);
			}
			if (!finalOutput) throw new Error("Fresh worker completed without a final report.");

			const truncated = truncateHead(finalOutput, {
				maxBytes: DEFAULT_MAX_BYTES,
				maxLines: DEFAULT_MAX_LINES,
			});
			let visibleOutput = truncated.content;
			if (truncated.truncated) {
				details.fullOutputPath = saveFullOutput(finalOutput);
				visibleOutput += `\n\n[Report truncated to ${truncated.outputLines} of ${truncated.totalLines} lines (${formatSize(truncated.outputBytes)} of ${formatSize(truncated.totalBytes)}). Full report: ${details.fullOutputPath}]`;
			}

			return {
				content: [{ type: "text", text: visibleOutput }],
				details,
			};
		},
	});
}
