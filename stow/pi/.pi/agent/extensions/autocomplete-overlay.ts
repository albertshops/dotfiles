import { CustomEditor, type ExtensionAPI, type Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth, type Component, type OverlayHandle, type TUI } from "@mariozechner/pi-tui";

let currentEditor: any;
let overlayHandle: OverlayHandle | undefined;

function padToWidth(line: string, width: number): string {
  return line + " ".repeat(Math.max(0, width - visibleWidth(line)));
}

function renderAutocompleteOverlay(width: number): string[] {
  if (!currentEditor?.autocompleteState || !currentEditor?.autocompleteList) return [];

  const lines = currentEditor.autocompleteList.render(Math.max(1, width));
  return lines.map((line: string) => truncateToWidth(line, width));
}

class AutocompleteOverlay implements Component {
  constructor(private theme: Theme) {}

  invalidate() {}

  render(width: number): string[] {
    const contentWidth = Math.max(1, width - 4);
    const items = renderAutocompleteOverlay(contentWidth);
    if (items.length === 0) return [];
    if (width < 8) return items;

    const border = (text: string) => this.theme.fg("borderMuted", text);
    const label = ` ${this.theme.fg("dim", "autocomplete")} `;
    const plainLabelWidth = " autocomplete ".length;
    const topRuleWidth = Math.max(0, width - 3 - plainLabelWidth);
    const top = border("╭─") + label + border("─".repeat(topRuleWidth) + "╮");
    const bottom = border("╰" + "─".repeat(Math.max(0, width - 2)) + "╯");

    const body = items.map((item) => {
      const content = padToWidth(truncateToWidth(item, contentWidth), contentWidth);
      return border("│ ") + this.theme.bg("customMessageBg", content) + border(" │");
    });

    return [top, ...body, bottom];
  }
}

class AutocompleteOverlayEditor extends CustomEditor {}

function wrapEditor(editor: any) {
  if (!editor || editor.__autocompleteOverlayWrapped) return editor;

  const originalRender = editor.render?.bind(editor);
  if (typeof originalRender !== "function") return editor;

  editor.__autocompleteOverlayWrapped = true;
  editor.render = (width: number) => {
    const autocompleteState = editor.autocompleteState;
    const autocompleteList = editor.autocompleteList;

    // Hide the built-in inline autocomplete list so it does not add layout height
    // and push the prompt upward. Autocomplete state remains intact for input
    // handling; a floating overlay renders the list instead.
    editor.autocompleteState = null;
    editor.autocompleteList = undefined;
    const lines = originalRender(width);
    editor.autocompleteState = autocompleteState;
    editor.autocompleteList = autocompleteList;

    return lines;
  };

  return editor;
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    const ui = ctx.ui as any;
    const originalSetEditorComponent = ui.setEditorComponent?.bind(ui);

    if (typeof originalSetEditorComponent === "function") {
      ui.setEditorComponent = (factory: any) => {
        if (!factory) {
          currentEditor = undefined;
          return originalSetEditorComponent(factory);
        }

        return originalSetEditorComponent((tui: TUI, theme: any, keybindings: any) => {
          currentEditor = wrapEditor(factory(tui, theme, keybindings));
          return currentEditor;
        });
      };

      ui.setEditorComponent((tui: TUI, theme: any, keybindings: any) =>
        new AutocompleteOverlayEditor(tui, theme, keybindings)
      );
    }

    void ctx.ui.custom((_tui, theme) => new AutocompleteOverlay(theme), {
      overlay: true,
      overlayOptions: {
        anchor: "bottom-left",
        width: "100%",
        maxHeight: 10,
        offsetY: -5,
        nonCapturing: true,
      },
      onHandle: (handle) => {
        overlayHandle = handle;
      },
    });
  });

  pi.on("session_shutdown", () => {
    overlayHandle?.hide();
    overlayHandle = undefined;
    currentEditor = undefined;
  });
}
