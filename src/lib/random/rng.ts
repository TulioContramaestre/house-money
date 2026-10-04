import { getRandomValues, randomBuffer } from "@/lib/security/trusted";

export interface Rng {
  int(n: number): number;
}

const RANGE = 4294967296;

function checkBound(n: number): void {
  if (!(typeof n === "number" && n >= 1 && n <= RANGE && n % 1 === 0)) {
    throw new RangeError(`Rng.int needs a whole number from 1 to 2^32, got ${n}`);
  }
}

export const cryptoRng: Rng = {
  int(n) {
    checkBound(n);
    const limit = RANGE - (RANGE % n);
    let x = limit;
    while (x >= limit) {
      getRandomValues(randomBuffer);
      x = randomBuffer[0] ?? limit;
    }
    return x % n;
  },
};

export function seededRng(seed: number): Rng {
  let state = seed >>> 0 || 0x9e3779b9;
  return {
    int(n) {
      checkBound(n);
      state ^= state << 13;
      state >>>= 0;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state % n;
    },
  };
}
