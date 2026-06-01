export const OBSERVATION_TYPES = [
  "bugfix",
  "change",
  "decision",
  "discovery",
  "feature",
  "refactor",
  "security_alert",
] as const;

export type ObservationType = (typeof OBSERVATION_TYPES)[number];

export interface Observation {
  id: number;
  memory_session_id: string;
  project: string;
  text: string | null;
  type: ObservationType;
  title: string | null;
  subtitle: string | null;
  facts: string | null;
  narrative: string | null;
  concepts: string | null;
  files_read: string | null;
  files_modified: string | null;
  prompt_number: number | null;
  discovery_tokens: number;
  created_at: string;
  created_at_epoch: number;
  content_hash: string | null;
  generated_by_model: string | null;
  relevance_count: number;
  merged_into_project: string | null;
  agent_type: string | null;
  agent_id: string | null;
  metadata: string | null;
}

export interface ObservationInsert {
  memory_session_id: string;
  project: string;
  type: ObservationType;
  title: string;
  narrative: string;
  text?: string | null;
  subtitle?: string | null;
  facts?: string | null;
  concepts?: string | null;
  files_read?: string | null;
  files_modified?: string | null;
  prompt_number?: number | null;
  discovery_tokens?: number;
  content_hash?: string;
  generated_by_model?: string | null;
  agent_type?: string | null;
  agent_id?: string | null;
  metadata?: string | null;
}
