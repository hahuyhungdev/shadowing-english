import { useCallback, useRef, useState } from "react";

interface UseSpeechRecognitionReturn {
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
  transcript: string;
  confidence: number;
  resetTranscript: () => void;
  isSupported: boolean;
}

// Web Speech API types (not in all TS libs)
type SpeechRecognitionType = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult:
    | ((event: {
        results: {
          [index: number]: {
            [index: number]: { transcript: string; confidence: number };
          };
        };
      }) => void)
    | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

interface WindowWithSpeech {
  SpeechRecognition?: SpeechRecognitionType;
  webkitSpeechRecognition?: SpeechRecognitionType;
}

function getSpeechRecognitionAPI(): SpeechRecognitionType | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as WindowWithSpeech;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [confidence, setConfidence] = useState(0);
  const recognitionRef = useRef<ReturnType<
    NonNullable<SpeechRecognitionType>["prototype"]["constructor"]
  > | null>(null);

  const SpeechRecognitionAPI = getSpeechRecognitionAPI();
  const isSupported = !!SpeechRecognitionAPI;

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const result = event.results[0][0];
      setTranscript(result.transcript);
      setConfidence(result.confidence);
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognitionAPI]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setConfidence(0);
  }, []);

  return {
    startListening,
    stopListening,
    isListening,
    transcript,
    confidence,
    resetTranscript,
    isSupported,
  };
}
