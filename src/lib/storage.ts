import type { SessionProgress, SentenceResult } from "../types";

const STORAGE_KEY = "shadowing-english";
const SESSIONS_KEY = `${STORAGE_KEY}-sessions`;
const SETTINGS_KEY = `${STORAGE_KEY}-settings`;

export interface AppSettings {
  darkMode: boolean;
  speed: number;
  loopMode: boolean;
  hideTextMode: boolean;
  autoPlayNext: boolean;
  autoPronounce: boolean;
  selectedAccent: string;
}

const defaultSettings: AppSettings = {
  darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
  speed: 1,
  loopMode: false,
  hideTextMode: false,
  autoPlayNext: false,
  autoPronounce: true,
  selectedAccent: "en-US",
};

// --- Settings ---

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// --- Session Progress ---

export function loadSession(transcriptHash: string): SessionProgress | null {
  try {
    const raw = localStorage.getItem(`${SESSIONS_KEY}-${transcriptHash}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(session: SessionProgress): void {
  localStorage.setItem(
    `${SESSIONS_KEY}-${session.transcriptHash}`,
    JSON.stringify(session),
  );
}

export function saveCurrentIndex(transcriptHash: string, index: number): void {
  const session = loadSession(transcriptHash);
  if (session) {
    session.currentIndex = index;
    session.updatedAt = Date.now();
    saveSession(session);
  }
}

export function saveSentenceResult(
  transcriptHash: string,
  result: SentenceResult,
): void {
  const session = loadSession(transcriptHash);
  if (session) {
    // Replace existing result for same sentence index, or append
    const existingIdx = session.results.findIndex(
      (r) => r.sentenceIndex === result.sentenceIndex,
    );
    if (existingIdx >= 0) {
      // Keep the best score
      if (result.score.overall > session.results[existingIdx].score.overall) {
        session.results[existingIdx] = result;
      }
    } else {
      session.results.push(result);
    }
    session.updatedAt = Date.now();
    saveSession(session);
  }
}

export function getAverageScore(transcriptHash: string): number {
  const session = loadSession(transcriptHash);
  if (!session || session.results.length === 0) return 0;
  const total = session.results.reduce((sum, r) => sum + r.score.overall, 0);
  return Math.round(total / session.results.length);
}

export function getScoreHistory(
  transcriptHash: string,
): { index: number; score: number; timestamp: number }[] {
  const session = loadSession(transcriptHash);
  if (!session) return [];
  return session.results
    .map((r) => ({
      index: r.sentenceIndex,
      score: r.score.overall,
      timestamp: r.timestamp,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}
