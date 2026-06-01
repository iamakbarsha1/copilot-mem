import * as vscode from "vscode";
import { ObservationWriter } from "../observation-writer";
import { basename, relative } from "path";

export function registerFileSaveObserver(
  context: vscode.ExtensionContext,
  writer: ObservationWriter,
): vscode.Disposable {
  return vscode.workspace.onDidSaveTextDocument((doc) => {
    const config = vscode.workspace.getConfiguration("copilotMem");
    if (!config.get<boolean>("enabled") || !config.get<boolean>("observeFileSaves")) {
      return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
    if (!workspaceFolder) return;

    const project = ObservationWriter.getProjectName(workspaceFolder.uri.fsPath);
    const filePath = relative(workspaceFolder.uri.fsPath, doc.uri.fsPath);
    const fileName = basename(doc.uri.fsPath);

    writer.queue({
      project,
      type: "change",
      title: `File saved: ${fileName}`,
      narrative: `File ${filePath} was saved in ${project}. Language: ${doc.languageId}, lines: ${doc.lineCount}.`,
      files_modified: filePath,
    });
  });
}
