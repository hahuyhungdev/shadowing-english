import { PracticeProvider } from "../features/practice/PracticeContext";
import { PracticeContent } from "../features/practice/PracticeContent";

export default function PracticePage() {
  return (
    <PracticeProvider>
      <PracticeContent />
    </PracticeProvider>
  );
}
