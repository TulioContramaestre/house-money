import { useCallback, useLayoutEffect, useRef, useState, type RefCallback } from "react";

export interface DomGuard {
  readonly key: number;
  readonly watch: RefCallback<HTMLElement>;
}

/** Remounts the guarded subtree whenever something other than React edits it. */
export function useDomGuard(options: MutationObserverInit): DomGuard {
  const [key, setKey] = useState(0);
  const observer = useRef<MutationObserver | null>(null);

  const watch = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      const watcher = new MutationObserver(() => setKey((k) => k + 1));
      watcher.observe(node, options);
      observer.current = watcher;
      return () => {
        watcher.disconnect();
        if (observer.current === watcher) observer.current = null;
      };
    },
    [options],
  );

  useLayoutEffect(() => {
    observer.current?.takeRecords();
  });

  return { key, watch };
}
