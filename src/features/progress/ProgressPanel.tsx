import { getScoreColor } from "../../lib/utils";
import { usePractice } from "../practice/PracticeContext";

export function ProgressPanel() {
  const { results, sentences, currentIndex, goToSentence } = usePractice();

  const totalSentences = sentences.length;
  const completedCount = results.length;
  const completionPercent = Math.round((completedCount / totalSentences) * 100);

  const averageScore =
    results.length > 0
      ? Math.round(
          results.reduce((sum, r) => sum + r.score.overall, 0) / results.length,
        )
      : 0;

  // Build a map of sentence index -> score
  const scoreMap = new Map<number, number>();
  for (const r of results) {
    scoreMap.set(r.sentenceIndex, r.score.overall);
  }

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700 p-6">
      <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-4">
        Progress
      </h3>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-surface-50 dark:bg-surface-800 rounded-xl">
          <p className="text-lg font-bold text-primary-600">{completedCount}</p>
          <p className="text-xs text-surface-500">Practiced</p>
        </div>
        <div className="text-center p-2 bg-surface-50 dark:bg-surface-800 rounded-xl">
          <p className={`text-lg font-bold ${getScoreColor(averageScore)}`}>
            {averageScore || "—"}
          </p>
          <p className="text-xs text-surface-500">Avg Score</p>
        </div>
        <div className="text-center p-2 bg-surface-50 dark:bg-surface-800 rounded-xl">
          <p className="text-lg font-bold text-surface-700 dark:text-surface-300">
            {completionPercent}%
          </p>
          <p className="text-xs text-surface-500">Complete</p>
        </div>
      </div>

      {/* Sentence grid with scores */}
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: totalSentences }, (_, i) => {
          const score = scoreMap.get(i);
          const isCurrent = i === currentIndex;

          return (
            <button
              key={i}
              onClick={() => goToSentence(i)}
              title={`Sentence ${i + 1}${score !== undefined ? ` — Score: ${score}` : ""}`}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                isCurrent
                  ? "ring-2 ring-primary-500 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"
                  : score !== undefined
                    ? score >= 80
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : score >= 60
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Recent scores */}
      {results.length > 0 && (
        <div className="mt-4 pt-3 border-t border-surface-200 dark:border-surface-700">
          <p className="text-xs text-surface-500 mb-2">Recent attempts</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {results
              .slice()
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, 5)
              .map((r) => (
                <div
                  key={`${r.sentenceIndex}-${r.timestamp}`}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <span className="text-surface-500">
                    #{r.sentenceIndex + 1}
                  </span>
                  <span
                    className={`font-medium ${getScoreColor(r.score.overall)}`}
                  >
                    {r.score.overall}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
