export type SessionStatus = "active" | "completed" | "failed";
export type PlatformSource = "claude" | "copilot";

export interface Session {
  id: number;
  content_session_id: string;
  memory_session_id: string | null;
  project: string;
  user_prompt: string | null;
  started_at: string;
  started_at_epoch: number;
  completed_at: string | null;
  completed_at_epoch: number | null;
  status: SessionStatus;
  worker_port: number | null;
  prompt_counter: number;
  custom_title: string | null;
  platform_source: PlatformSource;
}

export interface SessionInsert {
  content_session_id: string;
  memory_session_id: string;
  project: string;
  platform_source: PlatformSource;
  user_prompt?: string | null;
  custom_title?: string | null;
}
