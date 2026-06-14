import type { Observation } from "./observation.js";

export interface SearchResult {
  id: number;
  title: string | null;
  type: string;
  project: string;
  created_at_epoch: number;
  rank: number;
}

export interface TimelineEntry {
  id: number;
  title: string | null;
  type: string;
  project: string;
  created_at: string;
  created_at_epoch: number;
  subtitle: string | null;
}

export interface ProjectSummary {
  project: string;
  observation_count: number;
  latest_epoch: number;
  types: Record<string, number>;
}

export interface SearchOptions {
  query: string;
  project?: string;
  type?: string;
  limit?: number;
  offset?: number;
  dateStart?: number;
  dateEnd?: number;
  orderBy?: "rank" | "recent" | "oldest";
}

export interface TimelineOptions {
  project?: string;
  anchor_id?: number;
  before?: number;
  after?: number;
  limit?: number;
}

export type ObservationDetail = Observation;
