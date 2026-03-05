/**
 * Supabase Storage only allows [a-zA-Z0-9._\-/] in keys.
 * Non-ASCII segments (e.g. Korean) are hex-encoded with a "u_" prefix.
 * ASCII-safe segments are left as-is for backward compatibility.
 */

export const FOLDER_PLACEHOLDER = "_placeholder";

const SAFE_RE = /^[a-zA-Z0-9._\-]+$/;

export function encodeSegment(name: string): string {
  if (SAFE_RE.test(name)) return name;
  return "u_" + Buffer.from(name, "utf8").toString("hex");
}

export function decodeSegment(key: string): string {
  if (key.startsWith("u_")) {
    try {
      return Buffer.from(key.slice(2), "hex").toString("utf8");
    } catch {
      return key;
    }
  }
  return key;
}

/** Encode a full path like "이론/과제/" → "u_ec9db4eba1a0/u_.../". Preserves trailing slash. */
export function encodePath(path: string): string {
  if (!path) return "";
  const trailing = path.endsWith("/");
  const encoded = path
    .split("/")
    .filter(Boolean)
    .map(encodeSegment)
    .join("/");
  return trailing ? encoded + "/" : encoded;
}

/** Decode a full storage path back to display names. */
export function decodePath(path: string): string {
  if (!path) return "";
  const trailing = path.endsWith("/");
  const decoded = path
    .split("/")
    .filter(Boolean)
    .map(decodeSegment)
    .join("/");
  return trailing ? decoded + "/" : decoded;
}
