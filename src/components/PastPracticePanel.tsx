import { useState, useTransition } from "react";
import { getScoreColor } from "../lib/utils";
import { isSupabaseEnabled } from "../lib/supabase";
import type { DialogueSummary } from "../types";

interface PastPracticePanelProps {
  dialogues: DialogueSummary[];
  isLoading: boolean;
  onLoadDialogue: (id: string) => Promise<void>;
  onRemoveDialogue?: (id: string, transcriptHash: string) => void;
}

export function PastPracticePanel({
  dialogues,
  isLoading,
  onLoadDialogue,
  onRemoveDialogue,
}: PastPracticePanelProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isSupabaseEnabled()) {
    return null;
  }

  function handleLoad(id: string) {
    setLoadingId(id);
    startTransition(async () => {
      await onLoadDialogue(id);
      setLoadingId(null);
    });
  }

  function handleRemove(
    e: React.MouseEvent,
    id: string,
    transcriptHash: string,
  ) {
    e.stopPropagation();
    const confirmed = window.confirm(
      "Remove this practice session? All progress will be lost.",
    );
    if (!confirmed) return;
    setRemovingId(id);
    onRemoveDialogue?.(id, transcriptHash);
    setRemovingId(null);
  }

  function formatDate(isoString: string) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700 p-6">
      <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-4 flex items-center gap-2">
        <span>📚</span> Past Practice
      </h3>

      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-surface-400">Loading...</span>
        </div>
      )}

      {!isLoading && dialogues.length === 0 && (
        <p className="text-sm text-surface-400 text-center py-4">
          No past sessions yet. Start practicing!
        </p>
      )}

      {!isLoading && dialogues.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {dialogues.map((d) => (
            <div
              key={d.id}
              className="relative rounded-xl border border-surface-200 dark:border-surface-700 group"
            >
              <button
                onClick={() => handleLoad(d.id)}
                disabled={isPending || removingId === d.id}
                className="w-full text-left p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-2 pr-8">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-700 dark:text-surface-300 truncate">
                      {d.title || "Untitled"}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-surface-400">
                        {d.sentenceCount} sentences
                      </span>
                      <span className="text-xs text-surface-400">
                        {d.practicedCount}/{d.sentenceCount} done
                      </span>
                      {d.averageScore > 0 && (
                        <span
                          className={`text-xs font-medium ${getScoreColor(d.averageScore)}`}
                        >
                          {d.averageScore}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-surface-400">
                      {formatDate(d.lastPracticedAt)}
                    </span>
                    {loadingId === d.id && isPending ? (
                      <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-xs text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        Load →
                      </span>
                    )}
                  </div>
                </div>

                {/* Mini progress bar */}
                <div className="mt-2 w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1">
                  <div
                    className="bg-primary-500 h-1 rounded-full transition-all"
                    style={{
                      width: `${d.sentenceCount > 0 ? (d.practicedCount / d.sentenceCount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </button>

              {/* Delete button */}
              {onRemoveDialogue && (
                <button
                  onClick={(e) => handleRemove(e, d.id, d.transcriptHash)}
                  disabled={removingId === d.id}
                  title="Remove"
                  className="absolute top-1/2 -translate-y-1/2 right-2 w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
