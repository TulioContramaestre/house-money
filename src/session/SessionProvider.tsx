"use client";

import type { ReactNode } from "react";
import { useLeaveWarning } from "./guards";

export function SessionProvider({ children }: { children: ReactNode }) {
  useLeaveWarning();
  return children;
}
