import { useNavigate } from "react-router";
import { usePractice } from "./PracticeContext";
import { PracticeHeader } from "./PracticeHeader";
import { SentenceDisplay } from "../sentence/SentenceDisplay";
import { PlaybackControls } from "../playback/PlaybackControls";
import { RecordButton } from "../recording/RecordButton";
import { ScoreDisplay } from "../recording/ScoreDisplay";
import { MistakeHighlight } from "../recording/MistakeHighlight";
import { SettingsPanel } from "../settings/SettingsPanel";
import { ProgressPanel } from "../progress/ProgressPanel";

export function PracticeContent() {
  const navigate = useNavigate();
  const {
    isLoading,
    sentences,
    currentScore,
    transcript,
    isRecognitionSupported,
  } = usePractice();

  if (isLoading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-surface-500">Loading practice session...</span>
        </div>
      </main>
    );
  }

  if (sentences.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-surface-500 mb-4">No sentences to practice.</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors font-medium"
        >
          ← Go Home
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <PracticeHeader />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          <SentenceDisplay />
          <PlaybackControls />
          <RecordButton />
          {currentScore && transcript && (
            <>
              <ScoreDisplay />
              <MistakeHighlight />
            </>
          )}
          {!isRecognitionSupported && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 text-sm text-yellow-700 dark:text-yellow-400">
              ⚠️ Speech Recognition is not supported in this browser. Please use
              Chrome or Edge for full functionality.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <SettingsPanel />
          <ProgressPanel />
        </div>
      </div>
    </main>
  );
}
