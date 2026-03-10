import type { SpeedRate } from "../types";

interface PlaybackControlsProps {
  onPlay: () => void;
  onStop: () => void;
  isSpeaking: boolean;
  speed: SpeedRate;
  onSpeedChange: (speed: SpeedRate) => void;
}

const speedOptions: SpeedRate[] = [0.6, 0.8, 1, 1.2, 1.5];

export function PlaybackControls({
  onPlay,
  onStop,
  isSpeaking,
  speed,
  onSpeedChange,
}: PlaybackControlsProps) {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700 p-4">
      <div className="flex items-center gap-3">
        {/* Play / Stop button */}
        <button
          onClick={isSpeaking ? onStop : onPlay}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            isSpeaking
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-primary-600 text-white hover:bg-primary-700"
          }`}
        >
          {isSpeaking ? "⏹ Stop" : "▶ Play"}
        </button>

        {/* Replay */}
        <button
          onClick={onPlay}
          disabled={isSpeaking}
          className="p-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 transition-colors"
          title="Replay"
        >
          🔄
        </button>

        {/* Speed control */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-surface-500 mr-1">Speed</span>
          {speedOptions.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                speed === s
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
