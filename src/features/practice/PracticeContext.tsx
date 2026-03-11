import {
  createContext,
  useContext,
  useCallback,
  useEffectEvent,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import { useSessionLoader } from "../session/useSessionLoader";
import { useAudioPlayback } from "../playback/useAudioPlayback";
import { useRecordingSession } from "../recording/useRecordingSession";
import { useSupabaseStorage } from "../session/useSupabaseStorage";
import { useSettings } from "../../contexts/SettingsContext";
import type {
  SentenceResult,
  SentenceScore,
  SpeedRate,
  AccentVoice,
} from "../../types";

// ─── Context type ─────────────────────────────────────────────

interface PracticeContextValue {
  // Session
  sentences: string[];
  currentIndex: number;
  currentSentence: string;
  results: SentenceResult[];
  isLoading: boolean;

  // Navigation
  goToSentence: (index: number) => void;
  goNext: () => void;
  goPrevious: () => void;

  // Sentence editing
  editSentence: (index: number, newText: string) => void;

  // Playback
  handlePlay: () => void;
  stop: () => void;
  isSpeaking: boolean;
  speed: SpeedRate;
  setSpeed: (speed: SpeedRate) => void;
  voices: AccentVoice[];
  selectedVoice: string;
  setSelectedVoice: (voiceURI: string) => void;

  // Recording
  startRecording: () => void;
  stopRecording: () => void;
  resetRecording: () => void;
  isRecording: boolean;
  duration: number;
  audioURL: string | null;
  isListening: boolean;
  isRecognitionSupported: boolean;

  // Score
  currentScore: SentenceScore | null;
  transcript: string;

  // Meta
  isPending: boolean;
  handleReset: () => void;
}

const PracticeContext = createContext<PracticeContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function usePractice() {
  const ctx = useContext(PracticeContext);
  if (!ctx) throw new Error("usePractice must be used within PracticeProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────

export function PracticeProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const storage = useSupabaseStorage();
  const session = useSessionLoader();
  const audio = useAudioPlayback();

  const currentSentence = session.sentences[session.currentIndex] ?? "";
  const recording = useRecordingSession(currentSentence);

  // ── Navigation ──────────────────────────────────────────────

  const goToSentence = useCallback(
    (index: number) => {
      if (index < 0 || index >= session.sentences.length) return;
      session.setCurrentIndex(index);
      recording.resetScore();
      recording.resetTranscript();
      recording.resetRecording();
      audio.stop();
      if (session.transcriptHash) {
        storage.saveCurrentIndex(session.transcriptHash, index);
      }
    },
    // audio.stop, recording.* are useEffectEvent — stable references
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.sentences.length, session.transcriptHash],
  );

  const goNext = useCallback(
    () => goToSentence(session.currentIndex + 1),
    [session.currentIndex, goToSentence],
  );

  const goPrevious = useCallback(
    () => goToSentence(session.currentIndex - 1),
    [session.currentIndex, goToSentence],
  );

  // ── Auto-pronounce on navigate ──────────────────────────────

  useEffect(() => {
    if (settings.autoPronounce && currentSentence) {
      const timer = setTimeout(() => {
        audio.speakWithLoop(currentSentence);
      }, 200);
      return () => clearTimeout(timer);
    }
    // audio.speakWithLoop is useEffectEvent — stable, no need in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.currentIndex, currentSentence, settings.autoPronounce]);

  // ── Keyboard shortcuts ──────────────────────────────────────

  // useEffectEvent: always reads latest goNext/goPrevious/audio without re-registering
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
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
        if (currentSentence) audio.speakWithLoop(currentSentence);
        break;
    }
  });

  useEffect(() => {
    if (session.sentences.length === 0) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [session.sentences.length]);

  // ── Scoring side effects ────────────────────────────────────

  const prevScoreRef = useRef<SentenceScore | null>(null);

  useEffect(() => {
    const score = recording.currentScore;
    if (!score || score === prevScoreRef.current) return;
    prevScoreRef.current = score;

    // Save result
    const result: SentenceResult = {
      sentenceIndex: session.currentIndex,
      originalText: currentSentence,
      spokenText: recording.transcript,
      score,
      timestamp: Date.now(),
    };

    if (session.transcriptHash) {
      storage.saveSentenceResult(session.transcriptHash, result);
      session.setResults((prev) => {
        const existingIdx = prev.findIndex(
          (r) => r.sentenceIndex === session.currentIndex,
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

    // Auto-play next sentence
    if (
      settings.autoPlayNext &&
      score.overall >= 70 &&
      session.currentIndex < session.sentences.length - 1
    ) {
      setTimeout(goNext, 2000);
    }

    // Loop mode — re-play current sentence
    if (settings.loopMode) {
      setTimeout(() => audio.handlePlay(currentSentence), 2000);
    }
    // audio.handlePlay is useEffectEvent — stable; goNext is useCallback captured via ref above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording.currentScore]);

  // Reset ref when score is cleared (navigation)
  useEffect(() => {
    if (!recording.currentScore) {
      prevScoreRef.current = null;
    }
  }, [recording.currentScore]);

  // ── Restore voice from settings ─────────────────────────────

  useEffect(() => {
    if (
      settings.selectedAccent &&
      audio.voices.length > 0 &&
      audio.selectedVoice !== settings.selectedAccent
    ) {
      const exists = audio.voices.some(
        (v) => v.voiceURI === settings.selectedAccent,
      );
      if (exists) {
        audio.setSelectedVoice(settings.selectedAccent);
      }
    }
    // audio.setSelectedVoice is useEffectEvent — stable, no need in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio.voices, audio.selectedVoice, settings.selectedAccent]);

  // ── Edit sentence ───────────────────────────────────────────

  const editSentence = useCallback(
    (index: number, newText: string) => {
      session.setSentences((prev) => {
        const updated = [...prev];
        updated[index] = newText;
        return updated;
      });
      storage.updateSentence(index, newText);
    },
    // storage.updateSentence is useEffectEvent — stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.setSentences],
  );

  // ── Reset & go home ────────────────────────────────────────

  const handleReset = useCallback(() => {
    audio.stop();
    recording.resetRecording();
    storage.refreshHistory();
    navigate("/");
    // audio.stop, recording.resetRecording, storage.refreshHistory are useEffectEvent — stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // ── Context value ───────────────────────────────────────────

  const value: PracticeContextValue = {
    sentences: session.sentences,
    currentIndex: session.currentIndex,
    currentSentence,
    results: session.results,
    isLoading: session.isLoading,

    goToSentence,
    goNext,
    goPrevious,
    editSentence,

    handlePlay: () => audio.handlePlay(currentSentence),
    stop: audio.stop,
    isSpeaking: audio.isSpeaking,
    speed: audio.speed,
    setSpeed: audio.setSpeed,
    voices: audio.voices,
    selectedVoice: audio.selectedVoice,
    setSelectedVoice: (voiceURI: string) => {
      audio.setSelectedVoice(voiceURI);
      updateSettings({ selectedAccent: voiceURI });
    },

    startRecording: recording.startRecording,
    stopRecording: recording.stopRecording,
    resetRecording: recording.resetRecording,
    isRecording: recording.isRecording,
    duration: recording.duration,
    audioURL: recording.audioURL,
    isListening: recording.isListening,
    isRecognitionSupported: recording.isSupported,

    currentScore: recording.currentScore,
    transcript: recording.transcript,

    isPending: storage.isPending,
    handleReset,
  };

  return <PracticeContext value={value}>{children}</PracticeContext>;
}
