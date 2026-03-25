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
      setIsGoogleSpeaking(true);
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voiceName: googleVoiceName,
            speakingRate: synthesis.speed,
          }),
        });

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

  const downloadAudio = useEffectEvent(async (text: string) => {
    if (!text) return;
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceName: googleVoiceName,
          speakingRate: synthesis.speed,
        }),
      });

      if (!response.ok) throw new Error("TTS download failed");

      const data = (await response.json()) as { audioContent?: string };
      if (!data.audioContent)
        throw new Error("Google TTS missing audioContent");

      const byteCharacters = atob(data.audioContent);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tts-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // nothing special — silence and let caller decide
    }
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
    googleVoiceName,
    setGoogleVoiceName,
    googleVoices: getChirp3MaleVoices(),
    downloadAudio,
  };
}
