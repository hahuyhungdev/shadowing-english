import { useTimer } from "./useTimer";

export function SessionTimer() {
  const timer = useTimer();
  return (
    <span className="text-sm tabular-nums font-mono text-surface-400">
      {timer.formatted}
    </span>
  );
}
