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
