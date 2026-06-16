export interface CorpusFilter {
  project?: string;
  types?: string[];
  concepts?: string[];
  files?: string[];
  query?: string;
  dateStart?: number;
  dateEnd?: number;
  limit?: number;
}

export interface CorpusManifest {
  name: string;
  description?: string;
  filter: CorpusFilter;
  observationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CorpusSession {
  corpusName: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  primedAt: string;
  observationCount: number;
}
