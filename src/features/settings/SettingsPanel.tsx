import { useSettings } from "../../contexts/SettingsContext";
import { usePractice } from "../practice/PracticeContext";

export function SettingsPanel() {
  const { settings, updateSettings } = useSettings();
  const {
    voices,
    selectedVoice,
    setSelectedVoice,
    ttsProvider,
    setTtsProvider,
    googleApiKey,
    setGoogleApiKey,
    googleVoiceName,
    setGoogleVoiceName,
    googleVoices,
    handleReset,
  } = usePractice();

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700 p-6">
      <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-4">
        Settings
      </h3>

      <div className="space-y-3">
        <ToggleItem
          label="Dark mode"
          icon="🌙"
          checked={settings.darkMode}
          onChange={() => updateSettings({ darkMode: !settings.darkMode })}
        />

        <ToggleItem
          label="Loop sentence"
          icon="🔁"
          checked={settings.loopMode}
          onChange={() => updateSettings({ loopMode: !settings.loopMode })}
        />

        <ToggleItem
          label="Hide text (memory)"
          icon="🙈"
          checked={settings.hideTextMode}
          onChange={() =>
            updateSettings({ hideTextMode: !settings.hideTextMode })
          }
        />

        <ToggleItem
          label="Auto-play next"
          icon="⏭"
          checked={settings.autoPlayNext}
          onChange={() =>
            updateSettings({ autoPlayNext: !settings.autoPlayNext })
          }
        />

        <ToggleItem
          label="Auto-pronounce"
          icon="🔊"
          checked={settings.autoPronounce}
          onChange={() =>
            updateSettings({ autoPronounce: !settings.autoPronounce })
          }
        />

        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <span>🎙</span>
            <span className="text-sm text-surface-700 dark:text-surface-300">
              TTS Provider
            </span>
          </div>
          <select
            value={ttsProvider}
            onChange={(e) => setTtsProvider(e.target.value as "edge" | "google")}
            className="text-sm bg-surface-100 dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg px-2 py-1 text-surface-700 dark:text-surface-300 outline-none"
          >
            <option value="edge">Edge (default)</option>
            <option value="google">Google TTS</option>
          </select>
        </div>

        {ttsProvider === "google" && (
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs text-surface-500 dark:text-surface-400 block">
                Google API Key (temporary)
              </label>
              <input
                type="password"
                value={googleApiKey}
                onChange={(e) => setGoogleApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full text-sm bg-surface-100 dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 text-surface-700 dark:text-surface-300 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-surface-500 dark:text-surface-400 block">
                Chirp 3 Male Voice
              </label>
              <select
                value={googleVoiceName}
                onChange={(e) => setGoogleVoiceName(e.target.value)}
                className="w-full text-sm bg-surface-100 dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 text-surface-700 dark:text-surface-300 outline-none"
              >
                {googleVoices.map((voice) => (
                  <option key={voice.value} value={voice.value}>
                    {voice.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {voices.length > 0 && (
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <span>🗣</span>
              <span className="text-sm text-surface-700 dark:text-surface-300">
                Accent
              </span>
            </div>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
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

      <button
        onClick={handleReset}
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
