import * as vscode from "vscode";
import { ObservationWriter } from "./observation-writer";

export function registerCommands(
  context: vscode.ExtensionContext,
  writer: ObservationWriter,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("copilotMem.saveObservation", async () => {
      const type = await vscode.window.showQuickPick(
        [
          "discovery",
          "decision",
          "bugfix",
          "change",
          "feature",
          "refactor",
          "security_alert",
        ],
        { placeHolder: "Observation type" },
      );
      if (!type) return;

      const title = await vscode.window.showInputBox({
        prompt: "Observation title",
        placeHolder: "Short description of what you observed",
      });
      if (!title) return;

      const narrative = await vscode.window.showInputBox({
        prompt: "Narrative",
        placeHolder: "Detailed description",
      });
      if (!narrative) return;

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const project = workspaceFolder
        ? ObservationWriter.getProjectName(workspaceFolder.uri.fsPath)
        : "unknown";

      writer.queue({ project, type, title, narrative });
      writer.flush();

      vscode.window.showInformationMessage(`Observation saved: ${title}`);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "copilotMem.searchObservations",
      async () => {
        const query = await vscode.window.showInputBox({
          prompt: "Search observations",
          placeHolder: "Enter search query",
        });
        if (!query) return;

        // Use the MCP server's search — but for the command, query DB directly
        try {
          const Database = require("better-sqlite3");
          const { homedir } = require("os");
          const { join } = require("path");

          const dbPath = process.env.CLAUDE_MEM_DATA_DIR
            ? join(process.env.CLAUDE_MEM_DATA_DIR, "claude-mem.db")
            : join(homedir(), ".claude-mem", "claude-mem.db");

          const db = new Database(dbPath, { readonly: true });
          db.pragma("journal_mode = WAL");

          const results = db
            .prepare(
              `SELECT o.id, o.title, o.type, o.project, o.narrative
               FROM observations_fts fts
               JOIN observations o ON o.id = fts.rowid
               WHERE observations_fts MATCH ?
               ORDER BY rank
               LIMIT 20`,
            )
            .all(query) as Array<{
            id: number;
            title: string;
            type: string;
            project: string;
            narrative: string;
          }>;

          db.close();

          if (results.length === 0) {
            vscode.window.showInformationMessage("No observations found.");
            return;
          }

          const items = results.map((r) => ({
            label: `[${r.type}] ${r.title}`,
            description: r.project,
            detail: r.narrative?.substring(0, 200),
            id: r.id,
          }));

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `${results.length} results`,
            matchOnDetail: true,
          });

          if (selected) {
            const full = results.find((r) => r.id === selected.id);
            if (full) {
              const doc = await vscode.workspace.openTextDocument({
                content: `# ${full.title}\n\nType: ${full.type}\nProject: ${full.project}\n\n${full.narrative || ""}`,
                language: "markdown",
              });
              await vscode.window.showTextDocument(doc);
            }
          }
        } catch (err) {
          vscode.window.showErrorMessage(
            `Search failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      },
    ),
  );
}
