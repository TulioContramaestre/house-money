export function isStake(n: unknown): n is number {
  return typeof n === "number" && n > 0 && n % 1000 === 0;
}

export function isWhole(n: unknown): n is number {
  return typeof n === "number" && n % 1 === 0;
}
