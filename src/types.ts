export interface AppSettings {
  darkMode: boolean;
  speed: number;
  loopMode: boolean;
  hideTextMode: boolean;
  autoPlayNext: boolean;
  autoPronounce: boolean;
  selectedAccent: string;
}

export interface SentenceScore {
  accuracy: number;
  completeness: number;
  fluency: number;
  confidence: number;
  overall: number;
}

export interface SentenceResult {
  sentenceIndex: number;
  originalText: string;
  spokenText: string;
  score: SentenceScore;
  timestamp: number;
}

export interface SessionProgress {
  transcriptHash: string;
  currentIndex: number;
  results: SentenceResult[];
  createdAt: number;
  updatedAt: number;
}

export interface WordComparison {
  word: string;
  status: "correct" | "missing" | "extra";
}

export type SpeedRate = 0.6 | 0.8 | 1 | 1.2 | 1.5;

export type AccentVoice = {
  label: string;
  lang: string;
  voiceURI: string;
};

// ─── Supabase DB row types (for reference / casting) ─────────

export interface DialogueRow {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface SentenceRow {
  id: string;
  dialogue_id: string;
  text: string;
  position: number;
  created_at: string;
}

export interface SessionRow {
  id: string;
  dialogue_id: string;
  avg_score: number;
  created_at: string;
}

export interface SentenceResultRow {
  id: string;
  session_id: string;
  sentence_id: string;
  accuracy: number;
  completeness: number;
  fluency: number;
  confidence: number;
  overall: number;
  created_at: string;
}

/** Summary of a past dialogue shown in the history list. */
export interface DialogueSummary {
  id: string;
  transcriptHash: string;
  title: string | null;
  sentenceCount: number;
  practicedCount: number;
  averageScore: number;
  lastPracticedAt: string;
}
