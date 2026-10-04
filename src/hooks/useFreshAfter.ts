import { useState } from "react";

interface Marks {
  readonly latest: number;
  readonly freshAfter: number;
}

/** Ids above the watermark arrived since the previous change; starting at the mount-time maximum keeps remounts from replaying the deal. */
export function useFreshAfter(latest: number): number {
  const [marks, setMarks] = useState<Marks>({ latest, freshAfter: latest });
  if (marks.latest === latest) return marks.freshAfter;
  const next = { latest, freshAfter: latest > marks.latest ? marks.latest : latest };
  setMarks(next);
  return next.freshAfter;
}
