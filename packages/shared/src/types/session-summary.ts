export interface SessionSummary {
  id: number;
  memory_session_id: string;
  project: string;
  request: string | null;
  investigated: string | null;
  learned: string | null;
  completed: string | null;
  next_steps: string | null;
  files_read: string | null;
  files_edited: string | null;
  notes: string | null;
  prompt_number: number | null;
  discovery_tokens: number;
  created_at: string;
  created_at_epoch: number;
  merged_into_project: string | null;
}

export interface SessionSummaryOptions {
  project?: string;
  limit?: number;
  offset?: number;
}
