import { DEFAULT_SPEED } from "../features/playback/useSpeechSynthesis";
import type { AppSettings } from "../types";

const STORAGE_KEY = "shadowing-english";
const SETTINGS_KEY = `${STORAGE_KEY}-settings`;

const defaultSettings: AppSettings = {
  darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
  speed: DEFAULT_SPEED,
  loopMode: false,
  hideTextMode: false,
  autoPlayNext: false,
  autoPronounce: true,
  selectedAccent: "en-US",
};

// --- Settings ---

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
