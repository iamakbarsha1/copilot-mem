import * as vscode from "vscode";
import { join } from "path";

/**
 * Auto-register the bundled MCP server with Copilot via
 * vscode.lm.registerMcpServerDefinitionProvider
 */
export function registerMcpProvider(
  context: vscode.ExtensionContext,
): vscode.Disposable | null {
  // This API may not be available in all VS Code versions
  if (!vscode.lm?.registerMcpServerDefinitionProvider) {
    console.log("[copilot-mem] MCP server definition provider API not available");
    return null;
  }

  const provider: vscode.McpServerDefinitionProvider = {
    provideMcpServerDefinitions(): vscode.McpServerDefinition[] {
      return [
        new vscode.McpStdioServerDefinition(
          "copilot-mem",
          "Copilot Mem — Persistent memory bridge",
          "node",
          [join(context.extensionPath, "dist", "mcp-server.js")],
        ),
      ];
    },
  };

  return vscode.lm.registerMcpServerDefinitionProvider("copilot-mem", provider);
}
