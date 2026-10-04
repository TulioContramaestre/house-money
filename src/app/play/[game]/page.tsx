import { notFound } from "next/navigation";
import { GameStage } from "@/games/GameStage";
import { GAME_IDS, isGameId } from "@/games/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return GAME_IDS.map((game) => ({ game }));
}

export default async function GamePage({ params }: PageProps<"/play/[game]">) {
  const { game } = await params;
  if (!isGameId(game)) notFound();
  return <GameStage requestedId={game} />;
}
