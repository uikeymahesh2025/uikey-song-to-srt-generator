export type ProcessingStage =
  | "idle"
  | "preparing"
  | "aligning"
  | "analyzing"
  | "gaps"
  | "generating"
  | "ready"
  | "error";

export interface AnalyzeStats {
  duration_seconds: number;
  total_events: number;
  lyric_lines: number;
  instrumental_gaps: number;
  music_events: number;
}

export interface AnalyzeResponse {
  success: boolean;
  srt: string;
  filename: string;
  stats?: AnalyzeStats;
  error?: string;
}

export interface StageInfo {
  key: ProcessingStage;
  label: string;
  description: string;
}
