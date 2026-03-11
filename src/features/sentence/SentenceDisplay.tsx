import { useEffect, useRef, useState } from "react";
import { usePractice } from "../practice/PracticeContext";
import { useSettings } from "../../contexts/SettingsContext";

export function SentenceDisplay() {
  const {
    currentSentence: sentence,
    currentIndex,
    sentences,
    goPrevious,
    goNext,
    editSentence,
  } = usePractice();
  const { settings } = useSettings();

  const totalSentences = sentences.length;
  const hideText = settings.hideTextMode;

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEditing = editingIndex === currentIndex;

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isEditing]);

  function startEdit() {
    setDraft(sentence);
    setEditingIndex(currentIndex);
  }

  function confirmEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== sentence) {
      editSentence(currentIndex, trimmed);
    }
    setEditingIndex(null);
  }

  function cancelEdit() {
    setEditingIndex(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      confirmEdit();
    }
    if (e.key === "Escape") {
      cancelEdit();
    }
  }

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-surface-500 dark:text-surface-400">
          Sentence
        </span>
        <span className="text-sm font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-3 py-1 rounded-full">
          {currentIndex + 1} / {totalSentences}
        </span>
      </div>

      <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1.5 mb-6">
        <div
          className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / totalSentences) * 100}%`,
          }}
        />
      </div>

      <div className="min-h-[80px] flex items-center justify-center relative group/sentence">
        {isEditing ? (
          <div className="w-full space-y-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-primary-400 bg-surface-50 dark:bg-surface-800 text-xl leading-relaxed text-surface-800 dark:text-surface-200 focus:outline-none resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 text-sm rounded-lg border border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmEdit}
                disabled={!draft.trim()}
                className="px-3 py-1.5 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : hideText ? (
          <p className="text-lg text-surface-400 dark:text-surface-500 italic">
            🙈 Text hidden — listen and repeat from memory
          </p>
        ) : (
          <>
            <p className="text-xl md:text-2xl leading-relaxed text-center font-medium text-surface-800 dark:text-surface-200 pr-8">
              {sentence}
            </p>
            <button
              onClick={startEdit}
              title="Edit sentence"
              className="absolute top-0 right-0 p-1.5 rounded-lg text-surface-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 opacity-0 group-hover/sentence:opacity-100 transition-all"
            >
              ✏️
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between mt-6 gap-4">
        <button
          onClick={goPrevious}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
        >
          ← Previous
        </button>
        <button
          onClick={goNext}
          disabled={currentIndex === totalSentences - 1}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
