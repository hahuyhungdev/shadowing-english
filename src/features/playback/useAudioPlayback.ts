import { useEffectEvent } from "react";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { useSettings } from "../../contexts/SettingsContext";

export function useAudioPlayback() {
  const synthesis = useSpeechSynthesis();
  const { settings } = useSettings();

  const speakWithLoop = useEffectEvent((text: string) => {
    synthesis.speak(text, () => {
      if (settings.loopMode) {
        setTimeout(() => speakWithLoop(text), 800);
      }
    });
  });

  const handlePlay = useEffectEvent((sentence: string | undefined) => {
    if (sentence) {
      speakWithLoop(sentence);
    }
  });

  return {
    speakWithLoop,
    handlePlay,
    isSpeaking: synthesis.isSpeaking,
    speed: synthesis.speed,
    setSpeed: synthesis.setSpeed,
    voices: synthesis.voices,
    selectedVoice: synthesis.selectedVoice,
    setSelectedVoice: synthesis.setSelectedVoice,
    stop: synthesis.stop,
  };
}
