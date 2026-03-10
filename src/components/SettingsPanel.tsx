import type { AccentVoice } from "../types";

interface SettingsPanelProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  loopMode: boolean;
  onToggleLoop: () => void;
  hideTextMode: boolean;
  onToggleHideText: () => void;
  autoPlayNext: boolean;
  onToggleAutoPlay: () => void;
  autoPronounce: boolean;
  onToggleAutoPronounce: () => void;
  voices: AccentVoice[];
  selectedAccent: string;
  onAccentChange: (accent: string) => void;
  onReset: () => void;
}

export function SettingsPanel({
  darkMode,
  onToggleDarkMode,
  loopMode,
  onToggleLoop,
  hideTextMode,
  onToggleHideText,
  autoPlayNext,
  onToggleAutoPlay,
  autoPronounce,
  onToggleAutoPronounce,
  voices,
  selectedAccent,
  onAccentChange,
  onReset,
}: SettingsPanelProps) {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700 p-6">
      <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-4">
        Settings
      </h3>

      <div className="space-y-3">
        {/* Dark Mode */}
        <ToggleItem
          label="Dark mode"
          icon="🌙"
          checked={darkMode}
          onChange={onToggleDarkMode}
        />

        {/* Loop Mode */}
        <ToggleItem
          label="Loop sentence"
          icon="🔁"
          checked={loopMode}
          onChange={onToggleLoop}
        />

        {/* Hide Text */}
        <ToggleItem
          label="Hide text (memory)"
          icon="🙈"
          checked={hideTextMode}
          onChange={onToggleHideText}
        />

        {/* Auto-play next */}
        <ToggleItem
          label="Auto-play next"
          icon="⏭"
          checked={autoPlayNext}
          onChange={onToggleAutoPlay}
        />

        {/* Auto-pronounce on navigate */}
        <ToggleItem
          label="Auto-pronounce"
          icon="🔊"
          checked={autoPronounce}
          onChange={onToggleAutoPronounce}
        />

        {/* Accent Selector */}
        {voices.length > 0 && (
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <span>🗣</span>
              <span className="text-sm text-surface-700 dark:text-surface-300">
                Accent
              </span>
            </div>
            <select
              value={selectedAccent}
              onChange={(e) => onAccentChange(e.target.value)}
              className="text-sm bg-surface-100 dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg px-2 py-1 text-surface-700 dark:text-surface-300 outline-none max-w-[180px]"
            >
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="mt-6 w-full px-4 py-2 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
      >
        ↩ New Transcript
      </button>
    </div>
  );
}

function ToggleItem({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="text-sm text-surface-700 dark:text-surface-300">
          {label}
        </span>
      </div>
      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-primary-600" : "bg-surface-300 dark:bg-surface-600"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
