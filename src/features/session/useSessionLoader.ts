import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useSupabaseStorage } from "./useSupabaseStorage";
import { hashTranscript } from "../../lib/utils";
import type { SentenceResult } from "../../types";

export function useSessionLoader() {
  const { hash } = useParams<{ hash: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const storage = useSupabaseStorage();

  const locationState = location.state as
    | {
        sentences?: string[];
        rawText?: string;
        currentIndex?: number;
        results?: SentenceResult[];
      }
    | undefined;

  const [sentences, setSentences] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcriptHash, setTranscriptHash] = useState(hash ?? "");
  const [results, setResults] = useState<SentenceResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Try location state first (navigated from home or loaded from history)
      if (locationState?.sentences && locationState.sentences.length > 0) {
        const s = locationState.sentences;
        const h = hash ?? hashTranscript(s.join(""));
        setSentences(s);
        setTranscriptHash(h);

        // When loading from history, hydrate from state and avoid re-saving dialogue.
        // This prevents duplicate dialogue inserts due to content mismatch.
        const hasHydratedProgress =
          typeof locationState.currentIndex === "number" ||
          Array.isArray(locationState.results);

        if (hasHydratedProgress) {
          setCurrentIndex(locationState.currentIndex ?? 0);
          setResults(locationState.results ?? []);
          setIsLoading(false);
          return;
        }

        // Fresh submit from home: save once and hydrate from DB session if available.
        storage.saveDialogue(
          s,
          locationState.rawText ?? s.join(" "),
          (dbSentences, session) => {
            setSentences(dbSentences);
            if (session) {
              setCurrentIndex(session.currentIndex);
              setResults(session.results);
            }
          },
        );

        setIsLoading(false);
        return;
      }

      // No state — try loading from Supabase by hash
      if (hash) {
        const dialogues = storage.pastDialogues;
        const match = dialogues.find((d) => d.transcriptHash === hash);
        if (match) {
          const loaded = await storage.loadPastDialogue(match.id);
          if (loaded) {
            setSentences(loaded.sentences);
            setTranscriptHash(loaded.hash);
            setCurrentIndex(loaded.currentIndex);
            setResults(loaded.results);
            setIsLoading(false);
            return;
          }
        }

        // If we still don't have sentences, redirect home
        if (sentences.length === 0) {
          navigate("/", { replace: true });
          return;
        }
      }

      setIsLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  return {
    sentences,
    setSentences,
    currentIndex,
    setCurrentIndex,
    transcriptHash,
    results,
    setResults,
    isLoading,
  };
}
