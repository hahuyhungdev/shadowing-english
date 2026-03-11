import { SessionTimer } from "../timer/SessionTimer";
import { usePractice } from "./PracticeContext";

export function PracticeHeader() {
  const { currentIndex, sentences, isPending } = usePractice();

  return (
    <div className="flex items-center justify-between mb-4">
      <span className="text-xs text-surface-500">
        {currentIndex + 1}/{sentences.length} sentences
      </span>
      <SessionTimer />
      {isPending && (
        <span className="flex items-center gap-1 text-xs text-primary-500">
          <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
          Syncing...
        </span>
      )}
    </div>
  );
}
