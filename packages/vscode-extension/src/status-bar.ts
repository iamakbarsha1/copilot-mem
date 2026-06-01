import * as vscode from "vscode";
import { ObservationWriter } from "./observation-writer";

export function createStatusBarItem(
  writer: ObservationWriter,
): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );

  item.command = "copilotMem.searchObservations";
  item.tooltip = "Copilot Mem — Click to search observations";

  function update() {
    const pending = writer.pendingCount;
    item.text = pending > 0 ? `$(database) ${pending}` : "$(database)";
  }

  update();
  const timer = setInterval(update, 5000);

  const originalDispose = item.dispose.bind(item);
  item.dispose = () => {
    clearInterval(timer);
    originalDispose();
  };

  item.show();
  return item;
}
