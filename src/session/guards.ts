import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";
import type { GameId } from "@/games/registry";
import { useActiveGame, useIsClient, useSessionStatus } from "./hooks";
import { session } from "./session";

export function useRequireIdleSession(): boolean {
  const status = useSessionStatus();
  const router = useRouter();
  useEffect(() => {
    if (status === "open") router.replace("/play");
    else if (status === "closed") router.replace("/receipt");
  }, [status, router]);
  return status === "idle" || status === "opening";
}

export function useRequireOpenSession(): boolean {
  const client = useIsClient();
  const status = useSessionStatus();
  const router = useRouter();
  useEffect(() => {
    if (client && status !== "open") router.replace(status === "closed" ? "/receipt" : "/");
  }, [client, status, router]);
  return client && status === "open";
}

export function useRequireClosedSession(): boolean {
  const client = useIsClient();
  const status = useSessionStatus();
  const router = useRouter();
  useEffect(() => {
    if (client && status !== "closed") router.replace("/");
  }, [client, status, router]);
  return client && status === "closed";
}

export function useRedirectToActiveGame(): void {
  const active = useActiveGame();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/play/${active}`);
  }, [active, router]);
}

export function useActivateGame(id: GameId): void {
  const router = useRouter();
  useLayoutEffect(() => {
    const result = session.activate(id);
    if (!result.ok) router.replace(`/play/${result.activeGame}`);
  }, [id, router]);
}

export function useLeaveWarning(): void {
  const status = useSessionStatus();
  useEffect(() => {
    if (status !== "open") return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);
}
