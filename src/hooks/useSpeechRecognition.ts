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
          length: number;
          [index: number]: {
            isFinal?: boolean;
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
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    // Track accumulated final results and their confidence values
    let finalTranscriptParts: string[] = [];
    let confidenceValues: number[] = [];

    recognition.onresult = (event) => {
      // Rebuild final transcript from all final results
      finalTranscriptParts = [];
      confidenceValues = [];
      let interimTranscript = "";
      let interimConfidence = 0;

      for (
        let i = 0;
        i < (event.results as unknown as ArrayLike<unknown>).length;
        i++
      ) {
        const result = event.results[i] as {
          isFinal?: boolean;
          [index: number]: { transcript: string; confidence: number };
        };
        if (result.isFinal) {
          finalTranscriptParts.push(result[0].transcript);
          confidenceValues.push(result[0].confidence);
        } else {
          interimTranscript += result[0].transcript;
          if (result[0].confidence > 0) {
            interimConfidence = result[0].confidence;
          }
        }
      }

      const fullTranscript = finalTranscriptParts.join("") + interimTranscript;
      setTranscript(fullTranscript);

      // Calculate average confidence from final results
      // Filter out zero values since some browsers return 0 for confidence
      const nonZeroConfidence = confidenceValues.filter((c) => c > 0);
      if (nonZeroConfidence.length > 0) {
        const avgConfidence =
          nonZeroConfidence.reduce((sum, c) => sum + c, 0) /
          nonZeroConfidence.length;
        setConfidence(avgConfidence);
      } else if (interimConfidence > 0) {
        // Fallback: use interim confidence if no final confidence available
        setConfidence(interimConfidence);
      }
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
    // Don't manually set isListening to false here.
    // Let the onend callback handle it, so the final onresult event
    // (with isFinal: true and real confidence) fires first.
    recognitionRef.current?.stop();
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
