import { chipClass } from "@/lib/money/chips";
import { fmt, short } from "@/lib/money/format";
import { ChipFace, type ChipSize } from "../ChipFace";

const SIZES = { small: "stakeSmall", medium: "stake", large: "stakeLarge" } as const satisfies Record<string, ChipSize>;

interface StakeMarkerProps {
  readonly amount: number;
  readonly size?: keyof typeof SIZES;
  readonly className?: string;
}

export function StakeMarker({ amount, size = "medium", className }: StakeMarkerProps) {
  if (!amount) return null;
  return (
    <ChipFace cls={chipClass(amount)} size={SIZES[size]} label={`${fmt(amount)} on this bet`} className={className}>
      {short(amount)}
    </ChipFace>
  );
}
