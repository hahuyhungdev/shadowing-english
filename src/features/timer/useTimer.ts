import { useEffect, useState } from "react";

export function useTimer() {
  const [elapsed, setElapsed] = useState(0); // seconds since mount

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const formatted = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return { elapsed, formatted };
}
