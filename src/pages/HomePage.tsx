import { useNavigate } from "react-router";
import { TranscriptInput } from "../components/TranscriptInput";
import { useSupabaseStorage } from "../features/session/useSupabaseStorage";
import { hashTranscript } from "../lib/utils";

export default function HomePage() {
  const navigate = useNavigate();
  const storage = useSupabaseStorage();

  function handleTranscriptSubmit(sentences: string[], rawText: string) {
    const hash = hashTranscript(sentences.join(""));

    // Save to Supabase + localStorage, then navigate to practice
    storage.saveDialogue(sentences, rawText);
    navigate(`/practice/${hash}`, { state: { sentences, rawText } });
  }

  async function handleLoadPastDialogue(dialogueId: string) {
    const loaded = await storage.loadPastDialogue(dialogueId);
    if (!loaded) return;

    navigate(`/practice/${loaded.hash}`, {
      state: { sentences: loaded.sentences },
    });
  }

  return (
    <main
      className="flex items-center justify-center"
      style={{ minHeight: "calc(100vh - 57px)" }}
    >
      <TranscriptInput
        onSubmit={handleTranscriptSubmit}
        pastDialogues={storage.pastDialogues}
        isLoadingHistory={storage.isLoadingHistory}
        onLoadPastDialogue={handleLoadPastDialogue}
        onRemovePastDialogue={storage.removeDialogue}
      />
    </main>
  );
}
