"use client";

import { useRouter } from "next/navigation";
import { GAMES, type GameId } from "@/games/registry";
import { useActiveGame, useActiveView } from "@/session/hooks";
import { session } from "@/session/session";
import { cx } from "../../cx";
import styles from "./GameTabs.module.css";

export function GameTabs() {
  const active = useActiveGame();
  const { canLeave } = useActiveView();
  const router = useRouter();

  const select = (id: GameId) => {
    if (session.requestSwitch(id) === "switched") router.push(`/play/${id}`);
  };

  return (
    <nav className={styles.tabs} role="tablist" aria-label="Games">
      {GAMES.map((game) => {
        const selected = game.id === active;
        return (
          <button
            key={game.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cx(styles.tab, !selected && !canLeave && styles.locked)}
            onClick={() => select(game.id)}
          >
            {game.name}
          </button>
        );
      })}
    </nav>
  );
}
