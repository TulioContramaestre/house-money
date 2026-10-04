import type { Rng } from "@/lib/random/rng";

export interface ScriptedRng extends Rng {
  readonly requested: number[];
  readonly remaining: () => number;
}

export function scriptedRng(values: readonly number[], fallback?: Rng): ScriptedRng {
  const queue = [...values];
  const requested: number[] = [];
  return {
    requested,
    remaining: () => queue.length,
    int(n) {
      requested.push(n);
      const next = queue.shift();
      if (next === undefined) {
        if (fallback) return fallback.int(n);
        throw new Error(`scriptedRng ran out of values (asked for int(${n}))`);
      }
      if (next < 0 || next >= n) throw new Error(`scripted value ${next} is out of range for int(${n})`);
      return next;
    },
  };
}
