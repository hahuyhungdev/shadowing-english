import { useEffectEvent, useRef, useState } from "react";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { useSettings } from "../../contexts/SettingsContext";

const CHIRP3_MALE_VOICES = [
  {
    label: "Algieba",
    value: "en-US-Chirp3-HD-Algieba",
  },
  { label: "Charon", value: "en-US-Chirp3-HD-Charon" },
  { label: "Puck", value: "en-US-Chirp3-HD-Puck" },
  { label: "Fenrir", value: "en-US-Chirp3-HD-Fenrir" },
  { label: "Orus", value: "en-US-Chirp3-HD-Orus" },
  { label: "Zephyr", value: "en-US-Chirp3-HD-Zephyr" },
] as const;

export type Chirp3VoiceName = (typeof CHIRP3_MALE_VOICES)[number]["value"];

export function getChirp3MaleVoices() {
  return [...CHIRP3_MALE_VOICES];
}

export function useAudioPlayback() {
  const synthesis = useSpeechSynthesis();
  const { settings } = useSettings();
  const [isGoogleSpeaking, setIsGoogleSpeaking] = useState(false);
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [googleVoiceName, setGoogleVoiceName] = useState<Chirp3VoiceName>(
    CHIRP3_MALE_VOICES[0].value,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useEffectEvent(() => {
    synthesis.stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsGoogleSpeaking(false);
  });

  const speakGoogle = useEffectEvent(
    async (text: string, onEnd?: () => void) => {
      if (!googleApiKey.trim()) {
        synthesis.speak(text, onEnd);
        return;
      }

      setIsGoogleSpeaking(true);
      try {
        const response = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(
            googleApiKey.trim(),
          )}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: { text },
              voice: {
                languageCode: "en-US",
                name: googleVoiceName,
              },
              audioConfig: {
                audioEncoding: "MP3",
                speakingRate: synthesis.speed,
              },
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`Google TTS error: ${response.status}`);
        }

        const data = (await response.json()) as { audioContent?: string };
        if (!data.audioContent) {
          throw new Error("Google TTS missing audioContent");
        }

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }

        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audioRef.current = audio;
        audio.onended = () => {
          setIsGoogleSpeaking(false);
          onEnd?.();
        };
        audio.onerror = () => {
          setIsGoogleSpeaking(false);
        };
        await audio.play();
      } catch {
        setIsGoogleSpeaking(false);
        synthesis.speak(text, onEnd);
      }
    },
  );

  const speakWithLoop = useEffectEvent((text: string) => {
    const onEnd = () => {
      if (settings.loopMode) {
        setTimeout(() => speakWithLoop(text), 800);
      }
    };

    if (settings.ttsProvider === "google") {
      void speakGoogle(text, onEnd);
      return;
    }

    synthesis.speak(text, onEnd);
  });

  const handlePlay = useEffectEvent((sentence: string | undefined) => {
    if (sentence) {
      speakWithLoop(sentence);
    }
  });

  return {
    speakWithLoop,
    handlePlay,
    isSpeaking:
      settings.ttsProvider === "google"
        ? isGoogleSpeaking
        : synthesis.isSpeaking,
    speed: synthesis.speed,
    setSpeed: synthesis.setSpeed,
    voices: synthesis.voices,
    selectedVoice: synthesis.selectedVoice,
    setSelectedVoice: synthesis.setSelectedVoice,
    stop,
    googleApiKey,
    setGoogleApiKey,
    googleVoiceName,
    setGoogleVoiceName,
    googleVoices: getChirp3MaleVoices(),
  };
}
