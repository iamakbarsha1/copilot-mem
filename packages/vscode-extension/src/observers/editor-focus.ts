import * as vscode from "vscode";
import { ObservationWriter } from "../observation-writer";
import { basename, relative } from "path";

export function registerEditorFocusObserver(
  context: vscode.ExtensionContext,
  writer: ObservationWriter,
): vscode.Disposable {
  return vscode.window.onDidChangeActiveTextEditor((editor) => {
    const config = vscode.workspace.getConfiguration("copilotMem");
    if (!config.get<boolean>("enabled") || !config.get<boolean>("observeEditorFocus")) {
      return;
    }

    if (!editor) return;

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (!workspaceFolder) return;

    const project = ObservationWriter.getProjectName(workspaceFolder.uri.fsPath);
    const filePath = relative(workspaceFolder.uri.fsPath, editor.document.uri.fsPath);
    const fileName = basename(editor.document.uri.fsPath);

    writer.queue({
      project,
      type: "discovery",
      title: `Viewed: ${fileName}`,
      narrative: `Opened ${filePath} in ${project}. Language: ${editor.document.languageId}.`,
      files_read: filePath,
    });
  });
}
