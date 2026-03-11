import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { AccentVoice, SpeedRate } from "../../types";

export const DEFAULT_SPEED: SpeedRate = 0.8;
const DEFAULT_VOICE_LANG =
  "Microsoft AndrewMultilingual Online (Natural) - English (United States)";

interface UseSpeechSynthesisReturn {
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  isSpeaking: boolean;
  speed: SpeedRate;
  setSpeed: (speed: SpeedRate) => void;
  voices: AccentVoice[];
  selectedVoice: string;
  setSelectedVoice: (lang: string) => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speed, setSpeed] = useState<SpeedRate>(DEFAULT_SPEED);
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE_LANG);
  const [voices, setVoices] = useState<AccentVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices (in useEffect to keep render pure — required for React Compiler)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadVoices = () => {
      const allVoices = speechSynthesis.getVoices();
      const englishVoices = allVoices
        .filter((v) => v.lang.startsWith("en"))
        .map((v) => ({
          label: `${v.name} (${v.lang})`,
          lang: v.lang,
          voiceURI: v.voiceURI,
        }));

      if (englishVoices.length > 0) {
        setVoices(englishVoices);
        setSelectedVoice((prev) => {
          if (prev && englishVoices.some((v) => v.voiceURI === prev))
            return prev;
          return englishVoices[0].voiceURI;
        });
      }
    };

    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const speak = useEffectEvent((text: string, onEnd?: () => void) => {
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;

    const allVoices = speechSynthesis.getVoices();
    const matchingVoice = allVoices.find((v) => v.voiceURI === selectedVoice);
    if (matchingVoice) {
      utterance.voice = matchingVoice;
      utterance.lang = matchingVoice.lang;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  });

  const stop = useEffectEvent(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  });

  return {
    speak,
    stop,
    isSpeaking,
    speed,
    setSpeed,
    voices,
    selectedVoice,
    setSelectedVoice,
  };
}
