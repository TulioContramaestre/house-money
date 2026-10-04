"use client";

import { useRedirectToActiveGame } from "@/session/guards";

export default function PlayPage() {
  useRedirectToActiveGame();
  return null;
}
