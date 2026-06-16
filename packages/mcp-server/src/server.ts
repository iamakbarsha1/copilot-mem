import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb, countByProject, getProjectContext } from "@copilot-mem/shared";
// Phase 1 tools
import { registerImportant } from "./tools/important.js";
import { registerSearchObservations } from "./tools/search-observations.js";
import { registerGetObservationDetails } from "./tools/get-observation-details.js";
import { registerGetTimeline } from "./tools/get-timeline.js";
import { registerSaveObservation } from "./tools/save-observation.js";
import { registerGetProjectContext } from "./tools/get-project-context.js";
import { registerListProjects } from "./tools/list-projects.js";
import { registerGetSessionSummaries } from "./tools/get-session-summaries.js";
import { registerObservationContext } from "./tools/observation-context.js";
// Phase 2 tools
import { registerSmartSearch } from "./tools/smart-search.js";
import { registerSmartOutline } from "./tools/smart-outline.js";
import { registerSmartUnfold } from "./tools/smart-unfold.js";
// Phase 3A: observation write + search + aliases
import { registerObservationAdd } from "./tools/observation-add.js";
import { registerObservationRecordEvent } from "./tools/observation-record-event.js";
import { registerObservationGenerationStatus } from "./tools/observation-generation-status.js";
import { registerObservationSearch } from "./tools/observation-search.js";
import { registerMemoryAdd, registerMemorySearch, registerMemoryContext } from "./tools/legacy-aliases.js";
// Phase 3B: corpus tools
import { registerBuildCorpus } from "./tools/build-corpus.js";
import { registerListCorpora } from "./tools/list-corpora.js";
import { registerPrimeCorpus } from "./tools/prime-corpus.js";
import { registerQueryCorpus } from "./tools/query-corpus.js";
import { registerRebuildCorpus } from "./tools/rebuild-corpus.js";
import { registerReprimeCorpus } from "./tools/reprime-corpus.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "copilot-mem",
    version: "0.2.0",
  });

  // Phase 1: Core tools (9)
  registerImportant(server);
  registerSearchObservations(server);
  registerGetObservationDetails(server);
  registerGetTimeline(server);
  registerSaveObservation(server);
  registerGetProjectContext(server);
  registerListProjects(server);
  registerGetSessionSummaries(server);
  registerObservationContext(server);

  // Phase 2: Smart explore (3)
  registerSmartSearch(server);
  registerSmartOutline(server);
  registerSmartUnfold(server);

  // Phase 3A: Observation write + search + aliases (7)
  registerObservationAdd(server);
  registerObservationRecordEvent(server);
  registerObservationGenerationStatus(server);
  registerObservationSearch(server);
  registerMemoryAdd(server);
  registerMemorySearch(server);
  registerMemoryContext(server);

  // Phase 3B: Corpus system (6)
  registerBuildCorpus(server);
  registerListCorpora(server);
  registerPrimeCorpus(server);
  registerQueryCorpus(server);
  registerRebuildCorpus(server);
  registerReprimeCorpus(server);

  // Resources
  server.resource(
    "recent-observations",
    "copilot-mem://observations/recent",
    { description: "Latest observations across all projects" },
    async () => {
      const db = getDb({ readonly: true });
      const observations = db
        .prepare(
          `SELECT id, title, type, project, created_at
           FROM observations
           ORDER BY created_at_epoch DESC
           LIMIT 20`,
        )
        .all();

      return {
        contents: [
          {
            uri: "copilot-mem://observations/recent",
            mimeType: "application/json",
            text: JSON.stringify(observations, null, 2),
          },
        ],
      };
    },
  );

  server.resource(
    "project-summary",
    "copilot-mem://projects/summary",
    { description: "All projects with observation counts" },
    async () => {
      const db = getDb({ readonly: true });
      const projects = countByProject(db);

      return {
        contents: [
          {
            uri: "copilot-mem://projects/summary",
            mimeType: "application/json",
            text: JSON.stringify(projects, null, 2),
          },
        ],
      };
    },
  );

  // Prompts
  server.prompt(
    "project-context",
    "Inject relevant observations for a project into the conversation",
    { project: { description: "Project name", required: true } },
    async ({ project }) => {
      const db = getDb({ readonly: true });
      const observations = getProjectContext(db, project, 20);

      const contextText = observations
        .map(
          (o) =>
            `[${o.type.toUpperCase()}] ${o.title}\n${o.narrative || o.text || ""}`,
        )
        .join("\n\n---\n\n");

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Here is the development context for project "${project}" from previous sessions:\n\n${contextText}\n\nUse this context to inform your responses about this project.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    "onboard",
    "Get up to speed on a project — key decisions, patterns, and recent changes",
    { project: { description: "Project name", required: true } },
    async ({ project }) => {
      const db = getDb({ readonly: true });
      const decisions = db
        .prepare(
          `SELECT title, narrative FROM observations
           WHERE project = ? AND type = 'decision'
           ORDER BY created_at_epoch DESC LIMIT 10`,
        )
        .all(project) as Array<{ title: string; narrative: string }>;

      const patterns = db
        .prepare(
          `SELECT title, narrative FROM observations
           WHERE project = ? AND type = 'discovery'
           ORDER BY created_at_epoch DESC LIMIT 10`,
        )
        .all(project) as Array<{ title: string; narrative: string }>;

      const recentChanges = db
        .prepare(
          `SELECT title, narrative, type FROM observations
           WHERE project = ? AND type IN ('feature', 'change', 'refactor')
           ORDER BY created_at_epoch DESC LIMIT 10`,
        )
        .all(project) as Array<{
        title: string;
        narrative: string;
        type: string;
      }>;

      let text = `# Project Onboarding: ${project}\n\n`;

      if (decisions.length) {
        text += `## Key Decisions\n`;
        for (const d of decisions) {
          text += `- **${d.title}**: ${d.narrative}\n`;
        }
        text += "\n";
      }

      if (patterns.length) {
        text += `## Discovered Patterns\n`;
        for (const p of patterns) {
          text += `- **${p.title}**: ${p.narrative}\n`;
        }
        text += "\n";
      }

      if (recentChanges.length) {
        text += `## Recent Changes\n`;
        for (const c of recentChanges) {
          text += `- [${c.type}] **${c.title}**: ${c.narrative}\n`;
        }
      }

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text,
            },
          },
        ],
      };
    },
  );

  return server;
}
