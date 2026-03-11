import { usePractice } from "../practice/PracticeContext";
import { getScoreColor, getScoreBgColor } from "../../lib/utils";

export function ScoreDisplay() {
  const { currentScore: score, transcript: spokenText } = usePractice();

  if (!score || !spokenText) return null;

  const scoreItems = [
    { label: "Accuracy", value: score.accuracy, icon: "🎯" },
    { label: "Completeness", value: score.completeness, icon: "✅" },
    { label: "Fluency", value: score.fluency, icon: "💬" },
    { label: "Confidence", value: score.confidence, icon: "🔊" },
  ];

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700 p-6">
      <div className="text-center mb-6">
        <div
          className={`inline-flex items-center justify-center w-24 h-24 rounded-full border-4 ${getScoreBgColor(score.overall)}`}
        >
          <span
            className={`text-3xl font-bold ${getScoreColor(score.overall)}`}
          >
            {score.overall}
          </span>
        </div>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-2">
          Overall Score
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {scoreItems.map((item) => (
          <div
            key={item.label}
            className={`p-3 rounded-xl border ${getScoreBgColor(item.value)}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{item.icon}</span>
              <span className="text-xs font-medium text-surface-600 dark:text-surface-400">
                {item.label}
              </span>
            </div>
            <span className={`text-lg font-bold ${getScoreColor(item.value)}`}>
              {item.value}%
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
        <p className="text-xs text-surface-500 mb-1">You said:</p>
        <p className="text-sm text-surface-700 dark:text-surface-300 italic">
          &ldquo;{spokenText}&rdquo;
        </p>
      </div>
    </div>
  );
}
