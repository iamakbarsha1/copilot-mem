import * as vscode from "vscode";
import { ObservationWriter } from "./observation-writer";
import { registerFileSaveObserver } from "./observers/file-save";
import { registerGitCommitObserver } from "./observers/git-commit";
import { registerEditorFocusObserver } from "./observers/editor-focus";
import { createStatusBarItem } from "./status-bar";
import { registerMcpProvider } from "./mcp-provider";
import { registerCommands } from "./commands";

let writer: ObservationWriter | undefined;

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("copilotMem");
  if (!config.get<boolean>("enabled")) return;

  const batchInterval = config.get<number>("batchIntervalMs") ?? 30000;
  writer = new ObservationWriter(batchInterval);
  writer.start();

  // Observers
  const fileSaveDisposable = registerFileSaveObserver(context, writer);
  context.subscriptions.push(fileSaveDisposable);

  const gitDisposable = registerGitCommitObserver(context, writer);
  if (gitDisposable) context.subscriptions.push(gitDisposable);

  const editorFocusDisposable = registerEditorFocusObserver(context, writer);
  context.subscriptions.push(editorFocusDisposable);

  // Status bar
  const statusBar = createStatusBarItem(writer);
  context.subscriptions.push(statusBar);

  // MCP provider for Copilot
  const mcpDisposable = registerMcpProvider(context);
  if (mcpDisposable) context.subscriptions.push(mcpDisposable);

  // Commands
  registerCommands(context, writer);

  console.log("[copilot-mem] Extension activated");
}

export function deactivate() {
  writer?.stop();
  writer = undefined;
}
