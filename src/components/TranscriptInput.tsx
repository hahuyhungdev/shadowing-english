import { useState } from "react";

interface TranscriptInputProps {
  onSubmit: (sentences: string[]) => void;
}

export function TranscriptInput({ onSubmit }: TranscriptInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (!text.trim()) return;
    const sentences = text
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    onSubmit(sentences);
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      setText(clipText);
    } catch {
      // Fallback - user can paste manually
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
          English Shadowing
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          Practice your English speaking by shadowing sentences
        </p>
      </div>

      <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-lg border border-surface-200 dark:border-surface-700 p-6">
        <label
          htmlFor="transcript"
          className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2"
        >
          Paste your transcript
        </label>
        <textarea
          id="transcript"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a YouTube transcript or any English text here...&#10;&#10;Each sentence will be split automatically for practice."
          className="w-full h-48 p-4 rounded-xl border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none transition-all"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={handlePaste}
            className="flex-1 px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors font-medium"
          >
            📋 Paste from Clipboard
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          >
            Start Practice →
          </button>
        </div>
        {text.trim() && (
          <p className="text-xs text-surface-400 mt-3 text-center">
            {
              text
                .split(/(?<=[.!?])\s+|\n+/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0).length
            }{" "}
            sentences detected
          </p>
        )}
      </div>
    </div>
  );
}
