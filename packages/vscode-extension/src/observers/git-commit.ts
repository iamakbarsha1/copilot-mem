import * as vscode from "vscode";
import { ObservationWriter } from "../observation-writer";

export function registerGitCommitObserver(
  context: vscode.ExtensionContext,
  writer: ObservationWriter,
): vscode.Disposable | null {
  const gitExt = vscode.extensions.getExtension("vscode.git");
  if (!gitExt) return null;

  const git = gitExt.exports.getAPI(1);
  if (!git) return null;

  const disposables: vscode.Disposable[] = [];

  for (const repo of git.repositories) {
    const disposable = repo.state.onDidChange(() => {
      const config = vscode.workspace.getConfiguration("copilotMem");
      if (!config.get<boolean>("enabled") || !config.get<boolean>("observeGitCommits")) {
        return;
      }

      const head = repo.state.HEAD;
      if (!head?.commit) return;

      const project = ObservationWriter.getProjectName(repo.rootUri.fsPath);

      writer.queue({
        project,
        type: "change",
        title: `Git commit on ${head.name || "HEAD"}`,
        narrative: `Commit ${head.commit.slice(0, 8)} on branch ${head.name || "detached"} in ${project}.`,
      });
    });
    disposables.push(disposable);
  }

  return vscode.Disposable.from(...disposables);
}
