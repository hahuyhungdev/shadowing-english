import { usePractice } from "../practice/PracticeContext";
import { formatTime } from "../../lib/utils";

export function RecordButton() {
  const {
    isRecording,
    duration,
    audioURL,
    startRecording,
    stopRecording,
    resetRecording,
    isListening,
  } = usePractice();

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700 p-6">
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isRecording
              ? "bg-red-500 hover:bg-red-600 animate-pulse-recording scale-110"
              : "bg-primary-600 hover:bg-primary-700 hover:scale-105"
          }`}
        >
          {isRecording ? (
            <span className="text-white text-3xl">⏹</span>
          ) : (
            <span className="text-white text-3xl">🎤</span>
          )}
        </button>

        {isRecording && (
          <div className="flex items-center gap-2 text-red-500 font-medium">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            Recording — {formatTime(duration)}
          </div>
        )}

        {isListening && !isRecording && (
          <p className="text-xs text-primary-500 animate-pulse">
            Processing speech...
          </p>
        )}

        {audioURL && !isRecording && (
          <div className="flex items-center gap-3 w-full">
            <audio src={audioURL} controls className="flex-1 h-10 rounded-xl" />
            <button
              onClick={resetRecording}
              className="px-3 py-2 rounded-xl text-xs border border-surface-300 dark:border-surface-600 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {!isRecording && !audioURL && (
          <p className="text-sm text-surface-400">Tap to record your voice</p>
        )}
      </div>
    </div>
  );
}
