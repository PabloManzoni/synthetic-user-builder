// Deterministic ASCII avatar for a synthetic user. Seeded by the profile name,
// so each user has a stable little face. All glyphs are single-width ASCII →
// perfect monospace alignment (every line is exactly 10 chars wide).

const HAIRS = ["________", "~~~~~~~~", "/\\/\\/\\/\\", "vVvVvVvV", "########", "^^^^^^^^", "::::::::", "wwwwwwww"];
const EYES = [" o    o ", " O    O ", " ^    ^ ", " -    - ", " *    * ", " @    @ ", " u    u ", " 0    0 ", " =    = "];
const NOSES = ["    >   ", "    L   ", "    v   ", "    7   ", "    .   ", "    j   "];
const MOUTHS = [" \\____/ ", "  ----  ", " \\wwww/ ", " vvvvvv ", " ====== ", "  ____  ", " \\_~~_/ "];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = (arr: string[], seed: string, salt: string) => arr[hash(seed + salt) % arr.length];

/** Returns a 6-line ASCII face string, deterministic for a given seed. */
export function asciiFace(seed: string): string {
  const s = seed.trim() || "anon";
  return [
    ".--------.",
    "|" + pick(HAIRS, s, "h") + "|",
    "|" + pick(EYES, s, "e") + "|",
    "|" + pick(NOSES, s, "n") + "|",
    "|" + pick(MOUTHS, s, "m") + "|",
    "'--------'",
  ].join("\n");
}
