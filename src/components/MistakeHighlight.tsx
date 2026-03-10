import { compareWords } from "../lib/utils";

interface MistakeHighlightProps {
  original: string;
  spoken: string;
}

export function MistakeHighlight({ original, spoken }: MistakeHighlightProps) {
  if (!spoken) return null;

  const comparison = compareWords(original, spoken);

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700 p-6">
      <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-3">
        Word Comparison
      </h3>

      {/* Original with highlighting */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {comparison.original.map((item, i) => (
          <span
            key={`${item.word}-${i}`}
            className={`px-2 py-1 rounded-lg text-sm font-medium ${
              item.status === "correct"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 line-through"
            }`}
          >
            {item.word}
          </span>
        ))}
      </div>

      {/* Extra words */}
      {comparison.extra.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-surface-500 mb-1.5">Extra words spoken:</p>
          <div className="flex flex-wrap gap-1.5">
            {comparison.extra.map((word, i) => (
              <span
                key={`extra-${word}-${i}`}
                className="px-2 py-1 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              >
                +{word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-500" />
          <span className="text-xs text-surface-500">Correct</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-500" />
          <span className="text-xs text-surface-500">Missing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-yellow-500" />
          <span className="text-xs text-surface-500">Extra</span>
        </div>
      </div>
    </div>
  );
}
