import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { SentenceDisplay } from "../components/SentenceDisplay";
import { PlaybackControls } from "../components/PlaybackControls";
import { RecordButton } from "../components/RecordButton";
import { ScoreDisplay } from "../components/ScoreDisplay";
import { MistakeHighlight } from "../components/MistakeHighlight";
import { ProgressPanel } from "../components/ProgressPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useRecorder } from "../hooks/useRecorder";
import { useSupabaseStorage } from "../hooks/useSupabaseStorage";
import { useSettings } from "../contexts/SettingsContext";
import {
  calculateAccuracy,
  calculateCompleteness,
  calculateFluency,
  calculateOverallScore,
  hashTranscript,
} from "../lib/utils";
import type { SentenceResult, SentenceScore } from "../types";

export default function PracticePage() {
  const { hash } = useParams<{ hash: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();

  // State from navigation or loaded from storage
  const locationState = location.state as
    | { sentences?: string[]; rawText?: string }
    | undefined;

  const [sentences, setSentences] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcriptHash, setTranscriptHash] = useState(hash ?? "");
  const [results, setResults] = useState<SentenceResult[]>([]);
  const [currentScore, setCurrentScore] = useState<SentenceScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hooks
  const synthesis = useSpeechSynthesis();
  const recognition = useSpeechRecognition();
  const recorder = useRecorder();
  const storage = useSupabaseStorage();

  const recordStartTimeRef = useRef<number>(0);

  // --- Restore saved accent when voices load ---
  useEffect(() => {
    if (
      settings.selectedAccent &&
      synthesis.voices.length > 0 &&
      synthesis.selectedVoice !== settings.selectedAccent
    ) {
      const exists = synthesis.voices.some(
        (v) => v.voiceURI === settings.selectedAccent,
      );
      if (exists) {
        synthesis.setSelectedVoice(settings.selectedAccent);
      }
    }
  }, [synthesis.voices, settings.selectedAccent]);

  // --- Load session data on mount ---
  useEffect(() => {
    async function load() {
      // Try location state first (navigated from home)
      if (locationState?.sentences && locationState.sentences.length > 0) {
        const s = locationState.sentences;
        const h = hash ?? hashTranscript(s.join(""));
        setSentences(s);
        setTranscriptHash(h);

        // Save to Supabase and load any existing progress
        storage.saveDialogue(
          s,
          locationState.rawText ?? s.join(" "),
          (session) => {
            if (session) {
              setCurrentIndex(session.currentIndex);
              setResults(session.results);
            }
          },
        );

        setIsLoading(false);
        return;
      }

      // No state — try loading from Supabase by hash
      if (hash) {
        // Try loading from Supabase dialogues list
        const dialogues = storage.pastDialogues;
        const match = dialogues.find((d) => d.transcriptHash === hash);
        if (match) {
          const loaded = await storage.loadPastDialogue(match.id);
          if (loaded) {
            setSentences(loaded.sentences);
            setTranscriptHash(loaded.hash);
            setCurrentIndex(loaded.currentIndex);
            setResults(loaded.results);
            setIsLoading(false);
            return;
          }
        }

        // If we still don't have sentences, redirect home
        if (sentences.length === 0) {
          navigate("/", { replace: true });
          return;
        }
      }

      setIsLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  // --- Play original sentence (with loop support) ---
  const loopModeRef = useRef(settings.loopMode);
  loopModeRef.current = settings.loopMode;

  function speakWithLoop(text: string) {
    synthesis.speak(text, () => {
      if (loopModeRef.current) {
        setTimeout(() => speakWithLoop(text), 800);
      }
    });
  }

  function handlePlay() {
    if (sentences[currentIndex]) {
      speakWithLoop(sentences[currentIndex]);
    }
  }

  // --- Navigation ---
  function goToSentence(index: number) {
    if (index < 0 || index >= sentences.length) return;
    setCurrentIndex(index);
    setCurrentScore(null);
    recognition.resetTranscript();
    recorder.resetRecording();
    synthesis.stop();
    if (transcriptHash) {
      storage.saveCurrentIndex(transcriptHash, index);
    }
  }

  function goNext() {
    goToSentence(currentIndex + 1);
  }

  function goPrevious() {
    goToSentence(currentIndex - 1);
  }

  // --- Auto-pronounce after navigation ---
  const prevIndexRef = useRef(currentIndex);
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      prevIndexRef.current = currentIndex;
      if (settings.autoPronounce && sentences[currentIndex]) {
        const timer = setTimeout(() => {
          speakWithLoop(sentences[currentIndex]);
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [currentIndex, sentences, settings.autoPronounce]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    if (sentences.length === 0) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goPrevious();
          break;
        case "ArrowRight":
          e.preventDefault();
          goNext();
          break;
        case "ArrowDown":
          e.preventDefault();
          if (sentences[currentIndex]) {
            speakWithLoop(sentences[currentIndex]);
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sentences, currentIndex]);

  // --- Recording ---
  async function handleStartRecording() {
    recognition.resetTranscript();
    setCurrentScore(null);
    recorder.resetRecording();
    recordStartTimeRef.current = Date.now();

    await recorder.startRecording();
    recognition.startListening();
  }

  function handleStopRecording() {
    recorder.stopRecording();
    recognition.stopListening();
  }

  // --- Calculate score when recognition completes ---
  useEffect(() => {
    if (
      recognition.transcript &&
      !recognition.isListening &&
      !recorder.isRecording &&
      sentences[currentIndex]
    ) {
      const original = sentences[currentIndex];
      const spoken = recognition.transcript;
      const durationSeconds = (Date.now() - recordStartTimeRef.current) / 1000;

      const accuracy = calculateAccuracy(original, spoken);
      const completeness = calculateCompleteness(original, spoken);
      const fluency = calculateFluency(spoken, durationSeconds);
      const browserConfidence = Math.round(recognition.confidence * 100);
      const confidence =
        browserConfidence > 0
          ? browserConfidence
          : Math.max(1, Math.round(accuracy * 0.6 + completeness * 0.4));

      const score: SentenceScore = {
        accuracy,
        completeness,
        fluency,
        confidence,
        overall: calculateOverallScore({
          accuracy,
          completeness,
          fluency,
          confidence,
        }),
      };

      setCurrentScore(score);

      // Save result to Supabase + localStorage
      const result: SentenceResult = {
        sentenceIndex: currentIndex,
        originalText: original,
        spokenText: spoken,
        score,
        timestamp: Date.now(),
      };

      if (transcriptHash) {
        storage.saveSentenceResult(transcriptHash, result);
        setResults((prev) => {
          const existingIdx = prev.findIndex(
            (r) => r.sentenceIndex === currentIndex,
          );
          if (existingIdx >= 0) {
            if (score.overall > prev[existingIdx].score.overall) {
              const updated = [...prev];
              updated[existingIdx] = result;
              return updated;
            }
            return prev;
          }
          return [...prev, result];
        });
      }

      // Auto-play next
      if (settings.autoPlayNext && score.overall >= 70) {
        setTimeout(() => {
          if (currentIndex < sentences.length - 1) {
            goNext();
          }
        }, 2000);
      }

      // Loop mode
      if (settings.loopMode) {
        setTimeout(() => {
          handlePlay();
        }, 2000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recognition.transcript, recognition.isListening, recorder.isRecording]);

  // --- Reset (go back to home) ---
  function handleReset() {
    recognition.resetTranscript();
    recorder.resetRecording();
    synthesis.stop();
    storage.refreshHistory();
    navigate("/");
  }

  // --- Loading state ---
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

  const currentSentence = sentences[currentIndex];
  const avgScore =
    results.length > 0
      ? Math.round(
          results.reduce((sum, r) => sum + r.score.overall, 0) / results.length,
        )
      : 0;

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      {/* Sentence counter in sub-header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-surface-500">
          {currentIndex + 1}/{sentences.length} sentences
        </span>
        {storage.isPending && (
          <span className="flex items-center gap-1 text-xs text-primary-500">
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            Syncing...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column - Main practice area */}
        <div className="lg:col-span-2 space-y-4">
          <SentenceDisplay
            sentence={currentSentence}
            currentIndex={currentIndex}
            totalSentences={sentences.length}
            hideText={settings.hideTextMode}
            onPrevious={goPrevious}
            onNext={goNext}
          />

          <PlaybackControls
            onPlay={handlePlay}
            onStop={synthesis.stop}
            isSpeaking={synthesis.isSpeaking}
            speed={synthesis.speed}
            onSpeedChange={synthesis.setSpeed}
          />

          <RecordButton
            isRecording={recorder.isRecording}
            duration={recorder.duration}
            audioURL={recorder.audioURL}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onResetRecording={recorder.resetRecording}
            isListening={recognition.isListening}
          />

          {currentScore && recognition.transcript && (
            <>
              <ScoreDisplay
                score={currentScore}
                spokenText={recognition.transcript}
              />
              <MistakeHighlight
                original={currentSentence}
                spoken={recognition.transcript}
              />
            </>
          )}

          {!recognition.isSupported && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 text-sm text-yellow-700 dark:text-yellow-400">
              ⚠️ Speech Recognition is not supported in this browser. Please use
              Chrome or Edge for full functionality.
            </div>
          )}
        </div>

        {/* Right column - Settings & Progress */}
        <div className="space-y-4">
          <SettingsPanel
            darkMode={settings.darkMode}
            onToggleDarkMode={() =>
              updateSettings({ darkMode: !settings.darkMode })
            }
            loopMode={settings.loopMode}
            onToggleLoop={() =>
              updateSettings({ loopMode: !settings.loopMode })
            }
            hideTextMode={settings.hideTextMode}
            onToggleHideText={() =>
              updateSettings({ hideTextMode: !settings.hideTextMode })
            }
            autoPlayNext={settings.autoPlayNext}
            onToggleAutoPlay={() =>
              updateSettings({ autoPlayNext: !settings.autoPlayNext })
            }
            autoPronounce={settings.autoPronounce}
            onToggleAutoPronounce={() =>
              updateSettings({ autoPronounce: !settings.autoPronounce })
            }
            voices={synthesis.voices}
            selectedAccent={synthesis.selectedVoice}
            onAccentChange={(voiceURI) => {
              synthesis.setSelectedVoice(voiceURI);
              updateSettings({ selectedAccent: voiceURI });
            }}
            onReset={handleReset}
          />

          <ProgressPanel
            results={results}
            averageScore={avgScore}
            totalSentences={sentences.length}
            currentIndex={currentIndex}
            onJumpTo={goToSentence}
          />
        </div>
      </div>
    </main>
  );
}
