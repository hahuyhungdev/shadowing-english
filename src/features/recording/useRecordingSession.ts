import { useRef, useState, useEffectEvent, useEffect } from "react";
import { useRecorder } from "./useRecorder";
import { useSpeechRecognition } from "./useSpeechRecognition";
import {
  calculateAccuracy,
  calculateCompleteness,
  calculateFluency,
  calculateOverallScore,
} from "../../lib/utils";
import type { SentenceScore } from "../../types";

/**
 * Manages recording, speech recognition, and auto-scoring.
 * Score is computed automatically when recognition finishes.
 */
export function useRecordingSession(currentSentence: string) {
  const recorder = useRecorder();
  const recognition = useSpeechRecognition();

  const [currentScore, setCurrentScore] = useState<SentenceScore | null>(null);
  const recordStartTimeRef = useRef<number>(0);

  // Auto-compute score when recognition finishes
  useEffect(() => {
    if (
      recognition.transcript &&
      !recognition.isListening &&
      !recorder.isRecording &&
      currentSentence
    ) {
      const spoken = recognition.transcript;
      const durationSeconds = (Date.now() - recordStartTimeRef.current) / 1000;

      const accuracy = calculateAccuracy(currentSentence, spoken);
      const completeness = calculateCompleteness(currentSentence, spoken);
      const fluency = calculateFluency(spoken, durationSeconds);
      const browserConfidence = Math.round(recognition.confidence * 100);
      const confidence =
        browserConfidence > 0
          ? browserConfidence
          : Math.max(1, Math.round(accuracy * 0.6 + completeness * 0.4));

      setCurrentScore({
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
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recognition.transcript, recognition.isListening, recorder.isRecording]);

  const startRecording = useEffectEvent(async () => {
    recognition.resetTranscript();
    setCurrentScore(null);
    recorder.resetRecording();
    recordStartTimeRef.current = Date.now();

    await recorder.startRecording();
    recognition.startListening();
  });

  const stopRecording = useEffectEvent(() => {
    recorder.stopRecording();
    recognition.stopListening();
  });

  const resetScore = useEffectEvent(() => setCurrentScore(null));

  return {
    currentScore,
    resetScore,
    startRecording,
    stopRecording,
    resetRecording: recorder.resetRecording,
    resetTranscript: recognition.resetTranscript,
    isRecording: recorder.isRecording,
    duration: recorder.duration,
    audioURL: recorder.audioURL,
    isListening: recognition.isListening,
    transcript: recognition.transcript,
    isSupported: recognition.isSupported,
  };
}
