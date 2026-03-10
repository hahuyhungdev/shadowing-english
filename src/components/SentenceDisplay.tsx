interface SentenceDisplayProps {
  sentence: string;
  currentIndex: number;
  totalSentences: number;
  hideText: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function SentenceDisplay({
  sentence,
  currentIndex,
  totalSentences,
  hideText,
  onPrevious,
  onNext,
}: SentenceDisplayProps) {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700 p-6">
      {/* Sentence counter */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-surface-500 dark:text-surface-400">
          Sentence
        </span>
        <span className="text-sm font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-3 py-1 rounded-full">
          {currentIndex + 1} / {totalSentences}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1.5 mb-6">
        <div
          className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / totalSentences) * 100}%`,
          }}
        />
      </div>

      {/* Sentence text */}
      <div className="min-h-[80px] flex items-center justify-center">
        {hideText ? (
          <p className="text-lg text-surface-400 dark:text-surface-500 italic">
            🙈 Text hidden — listen and repeat from memory
          </p>
        ) : (
          <p className="text-xl md:text-2xl leading-relaxed text-center font-medium text-surface-800 dark:text-surface-200">
            {sentence}
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 gap-4">
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
        >
          ← Previous
        </button>
        <button
          onClick={onNext}
          disabled={currentIndex === totalSentences - 1}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
