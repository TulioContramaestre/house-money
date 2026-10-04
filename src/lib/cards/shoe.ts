import type { Rng } from "@/lib/random/rng";
import { freeze, itemAt } from "@/lib/security/trusted";
import { RANKS, SUITS, type Card, type Rank, type Suit } from "./card";

export interface CardSource {
  readonly low: boolean;
  shuffle(): void;
  draw(): Card;
}

interface Face {
  readonly r: Rank;
  readonly s: Suit;
}

export class Shoe implements CardSource {
  readonly #decks: number;
  readonly #cut: number;
  readonly #rng: Rng;
  #faces: Face[] = [];
  #next = -1;
  #seq = 0;

  constructor(decks: number, cut: number, rng: Rng) {
    this.#decks = decks;
    this.#cut = cut;
    this.#rng = rng;
    this.shuffle();
  }

  shuffle(): void {
    const faces: Face[] = [];
    let n = 0;
    for (let d = 0; d < this.#decks; d++) {
      for (let s = 0; s < SUITS.length; s++) {
        for (let r = 0; r < RANKS.length; r++) {
          faces[n] = { r: itemAt(RANKS, r), s: itemAt(SUITS, s) };
          n++;
        }
      }
    }
    for (let i = n - 1; i > 0; i--) {
      const j = this.#rng.int(i + 1);
      const held = itemAt(faces, i);
      faces[i] = itemAt(faces, j);
      faces[j] = held;
    }
    this.#faces = faces;
    this.#next = n - 1;
  }

  get low(): boolean {
    return this.#next + 1 < this.#cut;
  }

  draw(): Card {
    if (this.#next < 0) this.shuffle();
    const face = itemAt(this.#faces, this.#next);
    this.#next--;
    this.#seq++;
    return freeze({ r: face.r, s: face.s, id: this.#seq });
  }
}
