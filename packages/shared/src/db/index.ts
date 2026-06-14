export { getDb, closeDb, createDb } from "./connection.js";
export type { ConnectionOptions } from "./connection.js";
export { ensureSchema, getSchemaVersion, CURRENT_SCHEMA_VERSION } from "./schema.js";
export {
  searchObservations,
  getObservationsByIds,
  getTimeline,
  insertObservation,
  countByProject,
  getProjectContext,
} from "./observations.js";
export {
  createSession,
  getSessionByContentId,
  getSessionByMemoryId,
  getOrCreateSession,
  completeSession,
} from "./sessions.js";
export {
  getSessionSummaries,
  searchSessionSummaries,
} from "./session-summaries.js";
