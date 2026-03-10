import { useCallback, useEffect, useRef, useState } from "react";
import { TranscriptInput } from "./components/TranscriptInput";
import { SentenceDisplay } from "./components/SentenceDisplay";
import { PlaybackControls } from "./components/PlaybackControls";
import { RecordButton } from "./components/RecordButton";
import { ScoreDisplay } from "./components/ScoreDisplay";
import { MistakeHighlight } from "./components/MistakeHighlight";
import { ProgressPanel } from "./components/ProgressPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { useSpeechSynthesis } from "./hooks/useSpeechSynthesis";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useRecorder } from "./hooks/useRecorder";
import {
  calculateAccuracy,
  calculateCompleteness,
  calculateFluency,
  calculateOverallScore,
  hashTranscript,
} from "./lib/utils";
import {
  loadSettings,
  saveSettings,
  loadSession,
  saveSession,
  saveCurrentIndex,
  saveSentenceResult,
  getAverageScore,
  type AppSettings,
} from "./lib/storage";
import type { SentenceResult, SentenceScore } from "./types";

function App() {
  // --- State ---
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcriptHash, setTranscriptHash] = useState("");
  const [results, setResults] = useState<SentenceResult[]>([]);
  const [currentScore, setCurrentScore] = useState<SentenceScore | null>(null);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  // --- Hooks ---
  const synthesis = useSpeechSynthesis();
  const recognition = useSpeechRecognition();
  const recorder = useRecorder();

  // Ref to track recording start time for fluency calculation
  const recordStartTimeRef = useRef<number>(0);

  // --- Dark mode ---
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings.darkMode]);

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

  // --- Persist settings ---
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // --- Handle transcript submission ---
  const handleTranscriptSubmit = useCallback((newSentences: string[]) => {
    const hash = hashTranscript(newSentences.join(""));
    setTranscriptHash(hash);
    setSentences(newSentences);

    // Load existing session or create new one
    const existing = loadSession(hash);
    if (existing) {
      setCurrentIndex(existing.currentIndex);
      setResults(existing.results);
    } else {
      setCurrentIndex(0);
      setResults([]);
      saveSession({
        transcriptHash: hash,
        currentIndex: 0,
        results: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }, []);

  // --- Play original sentence (with loop support) ---
  const loopModeRef = useRef(settings.loopMode);
  loopModeRef.current = settings.loopMode;

  const speakWithLoop = useCallback(
    (text: string) => {
      synthesis.speak(text, () => {
        if (loopModeRef.current) {
          setTimeout(() => speakWithLoop(text), 800);
        }
      });
    },
    [synthesis],
  );

  const handlePlay = useCallback(() => {
    if (sentences[currentIndex]) {
      speakWithLoop(sentences[currentIndex]);
    }
  }, [sentences, currentIndex, speakWithLoop]);

  // --- Navigation ---
  const goToSentence = useCallback(
    (index: number) => {
      if (index < 0 || index >= sentences.length) return;
      setCurrentIndex(index);
      setCurrentScore(null);
      recognition.resetTranscript();
      recorder.resetRecording();
      synthesis.stop();
      if (transcriptHash) {
        saveCurrentIndex(transcriptHash, index);
      }
    },
    [sentences.length, transcriptHash, recognition, recorder, synthesis],
  );

  const goNext = useCallback(
    () => goToSentence(currentIndex + 1),
    [currentIndex, goToSentence],
  );
  const goPrevious = useCallback(
    () => goToSentence(currentIndex - 1),
    [currentIndex, goToSentence],
  );

  // --- Auto-pronounce after navigation ---
  const prevIndexRef = useRef(currentIndex);
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      prevIndexRef.current = currentIndex;
      if (settings.autoPronounce && sentences[currentIndex]) {
        // Small delay to let the state settle after navigation
        const timer = setTimeout(() => {
          speakWithLoop(sentences[currentIndex]);
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [currentIndex, sentences, settings.autoPronounce, speakWithLoop]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    if (sentences.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in an input/textarea
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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sentences, currentIndex, goPrevious, goNext, speakWithLoop]);

  // --- Recording ---
  const handleStartRecording = useCallback(async () => {
    recognition.resetTranscript();
    setCurrentScore(null);
    recorder.resetRecording();
    recordStartTimeRef.current = Date.now();

    // Start both recording and speech recognition simultaneously
    await recorder.startRecording();
    recognition.startListening();
  }, [recognition, recorder]);

  const handleStopRecording = useCallback(() => {
    recorder.stopRecording();
    recognition.stopListening();
  }, [recorder, recognition]);

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
      const confidence = Math.round(recognition.confidence * 100);

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

      // Save result
      const result: SentenceResult = {
        sentenceIndex: currentIndex,
        originalText: original,
        spokenText: spoken,
        score,
        timestamp: Date.now(),
      };

      if (transcriptHash) {
        saveSentenceResult(transcriptHash, result);
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

      // Loop mode: auto-replay the sentence after scoring so user can try again
      if (settings.loopMode) {
        setTimeout(() => {
          handlePlay();
        }, 2000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recognition.transcript, recognition.isListening, recorder.isRecording]);

  // --- Reset ---
  const handleReset = useCallback(() => {
    setSentences([]);
    setCurrentIndex(0);
    setTranscriptHash("");
    setResults([]);
    setCurrentScore(null);
    recognition.resetTranscript();
    recorder.resetRecording();
    synthesis.stop();
  }, [recognition, recorder, synthesis]);

  // --- Render ---
  if (sentences.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <TranscriptInput onSubmit={handleTranscriptSubmit} />
      </div>
    );
  }

  const currentSentence = sentences[currentIndex];
  const avgScore = transcriptHash ? getAverageScore(transcriptHash) : 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-surface-950/80 backdrop-blur-xl border-b border-surface-200 dark:border-surface-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
            English Shadowing
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-surface-500">
              {currentIndex + 1}/{sentences.length}
            </span>
            <button
              onClick={() => updateSettings({ darkMode: !settings.darkMode })}
              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              {settings.darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
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
                ⚠️ Speech Recognition is not supported in this browser. Please
                use Chrome or Edge for full functionality.
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
    </div>
  );
}

export default App;
