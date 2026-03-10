/**
 * Normalize text for comparison: lowercase, remove punctuation, collapse whitespace.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split transcript into sentences.
 * Handles period, question mark, exclamation, and newline-based splitting.
 */
export function splitIntoSentences(transcript: string): string[] {
  return transcript
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Compute Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate accuracy score based on Levenshtein distance.
 * Returns 0-100.
 */
export function calculateAccuracy(original: string, spoken: string): number {
  const normOrig = normalizeText(original);
  const normSpoken = normalizeText(spoken);

  if (normOrig.length === 0) return spoken.length === 0 ? 100 : 0;

  const distance = levenshteinDistance(normOrig, normSpoken);
  const maxLen = Math.max(normOrig.length, normSpoken.length);
  return Math.max(0, Math.round((1 - distance / maxLen) * 100));
}

/**
 * Calculate completeness: percentage of original words that appear in spoken text.
 * Returns 0-100.
 */
export function calculateCompleteness(
  original: string,
  spoken: string,
): number {
  const origWords = normalizeText(original).split(" ").filter(Boolean);
  const spokenWords = normalizeText(spoken).split(" ").filter(Boolean);

  if (origWords.length === 0) return 100;

  let matched = 0;

  // Use a more nuanced approach: count each original word that appears
  const spokenWordCounts = new Map<string, number>();
  for (const w of spokenWords) {
    spokenWordCounts.set(w, (spokenWordCounts.get(w) ?? 0) + 1);
  }

  for (const word of origWords) {
    const count = spokenWordCounts.get(word);
    if (count && count > 0) {
      matched++;
      spokenWordCounts.set(word, count - 1);
    }
  }

  return Math.round((matched / origWords.length) * 100);
}

/**
 * Calculate fluency based on words per second compared to ideal speaking rate.
 * Ideal English rate: ~2.5 words per second.
 * Returns 0-100.
 */
export function calculateFluency(
  spoken: string,
  durationSeconds: number,
): number {
  const words = normalizeText(spoken).split(" ").filter(Boolean);
  if (words.length === 0 || durationSeconds <= 0) return 0;

  const wps = words.length / durationSeconds;
  const idealWps = 2.5;

  // Score based on how close to ideal rate
  const ratio = wps / idealWps;
  // Penalize both too slow and too fast, but more gently
  if (ratio >= 0.7 && ratio <= 1.5) return 100;
  if (ratio < 0.7) return Math.round((ratio / 0.7) * 100);
  return Math.max(0, Math.round((1 - (ratio - 1.5) / 1.5) * 100));
}

/**
 * Calculate overall weighted score.
 */
export function calculateOverallScore(scores: {
  accuracy: number;
  completeness: number;
  fluency: number;
  confidence: number;
}): number {
  const weights = {
    accuracy: 0.35,
    completeness: 0.3,
    fluency: 0.15,
    confidence: 0.2,
  };

  return Math.round(
    scores.accuracy * weights.accuracy +
      scores.completeness * weights.completeness +
      scores.fluency * weights.fluency +
      scores.confidence * weights.confidence,
  );
}

/**
 * Compare original and spoken text word by word.
 * Returns array with status for each word.
 */
export function compareWords(
  original: string,
  spoken: string,
): {
  original: { word: string; status: "correct" | "missing" }[];
  extra: string[];
} {
  const origWords = normalizeText(original).split(" ").filter(Boolean);
  const spokenWords = normalizeText(spoken).split(" ").filter(Boolean);

  const spokenSet = new Map<string, number>();
  for (const w of spokenWords) {
    spokenSet.set(w, (spokenSet.get(w) ?? 0) + 1);
  }

  const origResult = origWords.map((word) => {
    const count = spokenSet.get(word);
    if (count && count > 0) {
      spokenSet.set(word, count - 1);
      return { word, status: "correct" as const };
    }
    return { word, status: "missing" as const };
  });

  // Find extra words spoken that weren't in original
  const origSet = new Map<string, number>();
  for (const w of origWords) {
    origSet.set(w, (origSet.get(w) ?? 0) + 1);
  }
  const extra: string[] = [];
  for (const w of spokenWords) {
    const count = origSet.get(w);
    if (count && count > 0) {
      origSet.set(w, count - 1);
    } else {
      extra.push(w);
    }
  }

  return { original: origResult, extra };
}

/**
 * Generate a simple hash for a transcript string (for identifying sessions).
 */
export function hashTranscript(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Format seconds into MM:SS display.
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get score color based on value.
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

/**
 * Get score background color.
 */
export function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-500/10 border-green-500/30";
  if (score >= 60) return "bg-yellow-500/10 border-yellow-500/30";
  if (score >= 40) return "bg-orange-500/10 border-orange-500/30";
  return "bg-red-500/10 border-red-500/30";
}
