import { usePractice } from "../practice/PracticeContext";
import type { SpeedRate } from "../../types";

const speedOptions: SpeedRate[] = [0.6, 0.8, 1, 1.2, 1.5];

export function PlaybackControls() {
  const {
    handlePlay,
    stop,
    isSpeaking,
    speed,
    setSpeed,
    downloadAudio,
    currentSentence,
    ttsProvider,
  } = usePractice();

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700 p-4">
      <div className="flex items-center gap-3">
        <button
          onClick={isSpeaking ? stop : handlePlay}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            isSpeaking
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-primary-600 text-white hover:bg-primary-700"
          }`}
        >
          {isSpeaking ? "⏹ Stop" : "▶ Play"}
        </button>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-surface-500 mr-1">Speed</span>
          <button
            onClick={() => void downloadAudio()}
            disabled={!currentSentence || ttsProvider !== "google"}
            className={`mr-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-surface-200 dark:border-surface-700 ${
              currentSentence && ttsProvider === "google"
                ? "bg-secondary-50 dark:bg-surface-800 text-surface-700 hover:bg-secondary-100"
                : "text-surface-300 cursor-not-allowed"
            }`}
          >
            ⬇ Download
          </button>
          {speedOptions.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
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
