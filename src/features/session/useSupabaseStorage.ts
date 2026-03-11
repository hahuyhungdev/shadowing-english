import { useEffect, useState, useTransition, useOptimistic } from "react";
import { supabase, isSupabaseEnabled } from "../../lib/supabase";
import type {
  DialogueSummary,
  SentenceResult,
  SessionProgress,
} from "../../types";
import { hashTranscript } from "../../lib/utils";

// ─── Supabase CRUD helpers ───────────────────────────────────

async function findDialogueByContent(content: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("dialogues")
    .select("id")
    .eq("content", content)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function insertDialogue(
  title: string,
  content: string,
): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("dialogues")
    .insert({ title, content })
    .select("id")
    .single();
  if (error) {
    console.error("[Supabase] insertDialogue:", error.message);
    return null;
  }
  return data.id;
}

async function insertSentenceRows(
  dialogueId: string,
  sentences: string[],
): Promise<{ id: string; position: number }[]> {
  if (!supabase) return [];
  const rows = sentences.map((text, i) => ({
    dialogue_id: dialogueId,
    text,
    position: i,
  }));
  const { data, error } = await supabase
    .from("sentences")
    .insert(rows)
    .select("id, position")
    .order("position");
  if (error) {
    console.error("[Supabase] insertSentenceRows:", error.message);
    return [];
  }
  return data ?? [];
}

async function fetchSentencesForDialogue(
  dialogueId: string,
): Promise<{ id: string; text: string; position: number }[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sentences")
    .select("id, text, position")
    .eq("dialogue_id", dialogueId)
    .order("position");
  if (error || !data) return [];
  return data;
}

async function createSession(dialogueId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("sessions")
    .insert({ dialogue_id: dialogueId })
    .select("id")
    .single();
  if (error) {
    console.error("[Supabase] createSession:", error.message);
    return null;
  }
  return data.id;
}

async function fetchLatestSession(dialogueId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("sessions")
    .select("id, avg_score")
    .eq("dialogue_id", dialogueId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function insertSentenceResult(
  sessionId: string,
  sentenceId: string,
  scores: {
    accuracy: number;
    completeness: number;
    fluency: number;
    confidence: number;
    overall: number;
  },
) {
  if (!supabase) return;
  const { error } = await supabase.from("sentence_results").insert({
    session_id: sessionId,
    sentence_id: sentenceId,
    accuracy: scores.accuracy,
    completeness: scores.completeness,
    fluency: scores.fluency,
    confidence: scores.confidence,
    overall: scores.overall,
  });
  if (error) console.error("[Supabase] insertSentenceResult:", error.message);
}

async function fetchResultsForSession(sessionId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sentence_results")
    .select("*, sentences(position, text)")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data;
}

// ─── Fetch all past dialogues with summaries ──────────────────

async function fetchPastDialogues(): Promise<DialogueSummary[]> {
  if (!supabase) return [];

  const { data: dialogues, error } = await supabase
    .from("dialogues")
    .select(
      `
      id,
      title,
      content,
      created_at,
      sentences(id, text, position),
      sessions(
        id,
        sentence_results(
          overall,
          sentence_id
        )
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !dialogues) {
    console.error("[Supabase] fetchPastDialogues:", error?.message);
    return [];
  }

  return dialogues.map((d) => {
    const sentRows = (d.sentences ?? []) as {
      id: string;
      text: string;
      position: number;
    }[];
    const sessions = (d.sessions ?? []) as {
      id: string;
      sentence_results: { overall: number; sentence_id: string }[];
    }[];
    const allResults = sessions.flatMap((s) => s.sentence_results ?? []);

    const bestBySentence = new Map<string, number>();
    for (const r of allResults) {
      const current = bestBySentence.get(r.sentence_id) ?? 0;
      if (Number(r.overall) > current)
        bestBySentence.set(r.sentence_id, Number(r.overall));
    }

    const practicedCount = bestBySentence.size;
    const avgScore =
      practicedCount > 0
        ? Math.round(
            [...bestBySentence.values()].reduce((a, b) => a + b, 0) /
              practicedCount,
          )
        : 0;

    const orderedTexts = [...sentRows]
      .sort((a, b) => a.position - b.position)
      .map((s) => s.text);
    const hash = hashTranscript(orderedTexts.join(""));

    return {
      id: d.id,
      transcriptHash: hash,
      title: d.title,
      sentenceCount: sentRows.length,
      practicedCount,
      averageScore: avgScore,
      lastPracticedAt: d.created_at,
    };
  });
}

// ─── Fetch / delete a dialogue ────────────────────────────────

async function fetchDialogueById(id: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("dialogues")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data;
}

async function deleteDialogueFromSupabase(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from("dialogues").delete().eq("id", id);
  if (error) console.error("[Supabase] deleteDialogue:", error.message);
}

// ─── Helper: map DB results → SentenceResult[] ───────────────

function mapDbResults(
  dbResults: Awaited<ReturnType<typeof fetchResultsForSession>>,
): SentenceResult[] {
  const bestBySentence = new Map<string, (typeof dbResults)[0]>();
  for (const r of dbResults) {
    const existing = bestBySentence.get(r.sentence_id);
    if (!existing || Number(r.overall) > Number(existing.overall)) {
      bestBySentence.set(r.sentence_id, r);
    }
  }
  return [...bestBySentence.values()]
    .map((r) => {
      const sent = r.sentences as unknown as {
        position: number;
        text: string;
      } | null;
      if (!sent) return null;
      return {
        sentenceIndex: sent.position,
        originalText: sent.text,
        spokenText: "",
        score: {
          accuracy: Number(r.accuracy),
          completeness: Number(r.completeness),
          fluency: Number(r.fluency),
          confidence: Number(r.confidence),
          overall: Number(r.overall),
        },
        timestamp: new Date(r.created_at).getTime(),
      };
    })
    .filter((r): r is SentenceResult => r !== null);
}

// ─── Main hook ────────────────────────────────────────────────

export function useSupabaseStorage() {
  const [isPending, startTransition] = useTransition();
  const [pastDialogues, setPastDialogues] = useState<DialogueSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [optimisticSaving, setOptimisticSaving] = useOptimistic(
    false,
    (_current: boolean, next: boolean) => next,
  );

  const [_dialogueId, setDialogueId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sentenceMap, setSentenceMap] = useState<Map<number, string>>(
    new Map(),
  );

  // ── Load past dialogues on mount ────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled()) return;
    setIsLoadingHistory(true);
    fetchPastDialogues()
      .then(setPastDialogues)
      .finally(() => setIsLoadingHistory(false));
  }, []);

  function refreshHistory() {
    if (!isSupabaseEnabled()) return;
    fetchPastDialogues().then(setPastDialogues);
  }

  function saveDialogue(
    sentences: string[],
    rawText: string,
    onSessionLoaded?: (
      sentences: string[],
      session: SessionProgress | null,
    ) => void,
  ) {
    const hash = hashTranscript(sentences.join(""));

    if (!isSupabaseEnabled()) {
      onSessionLoaded?.(sentences, null);
      return hash;
    }

    startTransition(async () => {
      setOptimisticSaving(true);
      try {
        let dId = await findDialogueByContent(rawText);
        let sentRows: { id: string; position: number; text: string }[] = [];

        if (dId) {
          const existing = await fetchSentencesForDialogue(dId);
          sentRows = existing.map((s) => ({
            id: s.id,
            position: s.position,
            text: s.text,
          }));
        } else {
          dId = await insertDialogue(
            sentences[0]?.slice(0, 60) ?? "Untitled",
            rawText,
          );
          if (!dId) return;
          const inserted = await insertSentenceRows(dId, sentences);
          sentRows = inserted.map((s, i) => ({
            id: s.id,
            position: s.position,
            text: sentences[i],
          }));
        }

        setDialogueId(dId);

        const map = new Map<number, string>();
        for (const s of sentRows) {
          map.set(s.position, s.id);
        }
        setSentenceMap(map);

        const dbSentences = [...sentRows]
          .sort((a, b) => a.position - b.position)
          .map((s) => s.text);

        const existingSession = await fetchLatestSession(dId);
        let sId = existingSession?.id ?? null;
        if (!sId) {
          sId = await createSession(dId);
        }
        if (sId) setSessionId(sId);

        if (sId) {
          const dbResults = await fetchResultsForSession(sId);
          onSessionLoaded?.(
            dbSentences,
            dbResults.length > 0
              ? {
                  transcriptHash: hash,
                  currentIndex: 0,
                  results: mapDbResults(dbResults),
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                }
              : null,
          );
        } else {
          onSessionLoaded?.(dbSentences, null);
        }
        refreshHistory();
      } finally {
        setOptimisticSaving(false);
      }
    });

    return hash;
  }

  function saveCurrentIndex(_hash: string, _index: number) {
    // intentionally empty — new schema doesn't track current_index
  }

  function saveSentenceResult(_hash: string, result: SentenceResult) {
    if (!isSupabaseEnabled() || !sessionId) return;

    const sentenceId = sentenceMap.get(result.sentenceIndex);
    if (!sentenceId) {
      console.warn("[Supabase] No sentence ID for index", result.sentenceIndex);
      return;
    }

    startTransition(async () => {
      setOptimisticSaving(true);
      try {
        await insertSentenceResult(sessionId, sentenceId, result.score);
        refreshHistory();
      } finally {
        setOptimisticSaving(false);
      }
    });
  }

  async function loadPastDialogue(id: string): Promise<{
    sentences: string[];
    hash: string;
    currentIndex: number;
    results: SentenceResult[];
  } | null> {
    if (!isSupabaseEnabled()) return null;

    const dialogue = await fetchDialogueById(id);
    if (!dialogue) return null;

    setDialogueId(dialogue.id);

    const sentRows = await fetchSentencesForDialogue(dialogue.id);
    const sentences = sentRows.map((s) => s.text);
    const hash = hashTranscript(sentences.join(""));

    const map = new Map<number, string>();
    for (const s of sentRows) {
      map.set(s.position, s.id);
    }
    setSentenceMap(map);

    const existingSession = await fetchLatestSession(dialogue.id);
    let sId = existingSession?.id ?? null;
    if (!sId) {
      sId = await createSession(dialogue.id);
    }
    if (sId) setSessionId(sId);

    let results: SentenceResult[] = [];
    if (sId) {
      const dbResults = await fetchResultsForSession(sId);
      results = mapDbResults(dbResults);
    }

    return { sentences, hash, currentIndex: 0, results };
  }

  function removeDialogue(id: string, _transcriptHash: string) {
    setPastDialogues((prev) => prev.filter((d) => d.id !== id));
    if (!isSupabaseEnabled()) return;
    startTransition(async () => {
      await deleteDialogueFromSupabase(id);
    });
  }

  function updateSentence(index: number, newText: string) {
    if (!isSupabaseEnabled()) return;
    const sentenceId = sentenceMap.get(index);
    if (!sentenceId) {
      console.warn("[Supabase] No sentence ID for index", index);
      return;
    }
    startTransition(async () => {
      const { error } = await supabase!
        .from("sentences")
        .update({ text: newText })
        .eq("id", sentenceId);
      if (error) console.error("[Supabase] updateSentence:", error.message);
    });
  }

  return {
    isPending: isPending || optimisticSaving,
    pastDialogues,
    isLoadingHistory,
    saveDialogue,
    saveCurrentIndex,
    saveSentenceResult,
    loadPastDialogue,
    removeDialogue,
    updateSentence,
    refreshHistory,
  };
}
