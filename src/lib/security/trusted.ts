// Built-ins captured at module load, before later scripts can swap them. Global prototypes aren't
// frozen, because React and Next patch built-ins at runtime and freezing breaks them.
const subtle: SubtleCrypto | undefined = globalThis.crypto.subtle;

export const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
export const hmacSign = subtle ? subtle.sign.bind(subtle) : null;
export const generateKey = subtle ? subtle.generateKey.bind(subtle) : null;
export const stringify = JSON.stringify;
export const freeze = Object.freeze;
export const isFrozen = Object.isFrozen;
export const encodeUtf8 = TextEncoder.prototype.encode.bind(new TextEncoder());
export const now = Date.now;
export const Bytes = Uint8Array;
export const randomBuffer = new Uint32Array(1);

export function itemAt<T>(list: ArrayLike<T>, index: number): T {
  const value = list[index];
  if (value === undefined) throw new RangeError(`Nothing at index ${index}`);
  return value;
}
