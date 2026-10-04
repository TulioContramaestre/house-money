"use client";

import { Component, type RefCallback } from "react";
import { useDomGuard } from "@/hooks/useDomGuard";
import type { LedgerEntry } from "@/lib/ledger/types";
import { useLedgerSnapshot } from "@/session/hooks";
import { LogEntry } from "../LogEntry";
import styles from "./SessionLog.module.css";

const TAPE_GUARD: MutationObserverInit = { subtree: true, childList: true, characterData: true, attributes: true };

interface TapeListProps {
  readonly entries: readonly LedgerEntry[];
  readonly redrawn: boolean;
  readonly watch: RefCallback<HTMLElement>;
}

interface ScrollSnapshot {
  readonly top: number;
  readonly height: number;
}

class TapeList extends Component<TapeListProps> {
  private readonly freshAfter: number;
  private list: HTMLOListElement | null = null;

  constructor(props: TapeListProps) {
    super(props);
    this.freshAfter = props.redrawn ? props.entries.length : 0;
  }

  private readonly attach = (node: HTMLOListElement | null) => {
    this.list = node;
    return this.props.watch(node);
  };

  getSnapshotBeforeUpdate(prev: TapeListProps): ScrollSnapshot | null {
    const list = this.list;
    if (!list || prev.entries.length >= this.props.entries.length || list.scrollTop < 8) return null;
    return { top: list.scrollTop, height: list.scrollHeight };
  }

  componentDidUpdate(_prev: TapeListProps, _state: unknown, snapshot: ScrollSnapshot | null) {
    const list = this.list;
    if (list && snapshot) list.scrollTop = snapshot.top + list.scrollHeight - snapshot.height;
  }

  render() {
    const { entries } = this.props;
    const newestFirst = [...entries].reverse();
    return (
      <ol ref={this.attach} className={styles.list}>
        {newestFirst.map((entry) => (
          <LogEntry key={entry.seq} entry={entry} fresh={entry.seq > this.freshAfter} />
        ))}
      </ol>
    );
  }
}

export function SessionLog() {
  const { entries } = useLedgerSnapshot();
  const { key, watch } = useDomGuard(TAPE_GUARD);
  const count = entries.length;
  return (
    <aside className={styles.tape} aria-label="Session log">
      <div className={styles.head}>
        <h2>Session log</h2>
        <span>
          {count} {count === 1 ? "entry" : "entries"}, newest first
        </span>
      </div>
      <TapeList key={key} entries={entries} redrawn={key > 0} watch={watch} />
    </aside>
  );
}
