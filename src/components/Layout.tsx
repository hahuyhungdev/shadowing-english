import { Link, Outlet, useLocation } from "react-router";
import { useSettings } from "../contexts/SettingsContext";
import { useSupabaseStorage } from "../hooks/useSupabaseStorage";

export function Layout() {
  const { settings, updateSettings } = useSettings();
  const storage = useSupabaseStorage();
  const location = useLocation();

  const isPracticePage = location.pathname.startsWith("/practice");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-surface-950/80 backdrop-blur-xl border-b border-surface-200 dark:border-surface-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="text-lg font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          >
            English Shadowing
          </Link>
          <div className="flex items-center gap-3">
            {/* Supabase sync indicator */}
            {storage.isPending && (
              <span className="flex items-center gap-1 text-xs text-primary-500">
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                Saving...
              </span>
            )}

            {/* Nav links */}
            {isPracticePage && (
              <Link
                to="/"
                className="text-xs text-surface-500 hover:text-primary-500 transition-colors"
              >
                ← Home
              </Link>
            )}

            <button
              onClick={() => updateSettings({ darkMode: !settings.darkMode })}
              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              {settings.darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      {/* Route content */}
      <Outlet />
    </div>
  );
}
