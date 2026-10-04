import { prefersReducedMotion } from "./motion";

export const REDUCED_MOTION_PAUSE = 80;

export function createPause(reducedMotion: () => boolean): (ms: number) => Promise<void> {
  return (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, reducedMotion() ? Math.min(ms, REDUCED_MOTION_PAUSE) : ms);
    });
}

export const pause = createPause(prefersReducedMotion);
