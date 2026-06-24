// Deterministic ASCII avatar for a synthetic user. Seeded by the profile name.
// Five varied dimensions (hair, brow, eyes, nose, mouth) → faces with distinct
// personality. All glyphs are single-width ASCII so every line is 10 chars wide.

const HAIRS = [
  "________",
  "~~~~~~~~",
  "/\\/\\/\\/\\",
  "^^^^^^^^",
  "oOoOoOoO",
  "########",
  "wwwwwwww",
  "========",
  "::::::::",
  "vVvVvVvV",
];

const BROWS = [
  "        ",
  " \\    / ",
  " /    \\ ",
  " ^    ^ ",
  " -    - ",
  " .    . ",
  " `    ` ",
];

const EYES = [
  " o    o ",
  " O    O ",
  " @    @ ",
  " *    * ",
  " -    - ",
  " ^    ^ ",
  " x    x ",
  " c    c ",
  " q    p ",
  "[o]  [o]",
  " o    - ",
  " =    = ",
];

const NOSES = ["   >    ", "   L    ", "   v    ", "   7    ", "   J    ", "   |    ", "   c    ", "   ?    "];

const MOUTHS = [
  " \\____/ ",
  "  ----  ",
  " \\wwww/ ",
  " vvvvvv ",
  " ====== ",
  "  ____  ",
  " \\_~~_/ ",
  " oOOOOo ",
  " <____> ",
  "  ~~~~  ",
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = (arr: string[], seed: string, salt: string) => arr[hash(seed + salt) % arr.length];

/** Returns a 7-line ASCII face string, deterministic for a given seed. */
export function asciiFace(seed: string): string {
  const s = seed.trim() || "anon";
  return [
    ".--------.",
    "|" + pick(HAIRS, s, "h") + "|",
    "|" + pick(BROWS, s, "b") + "|",
    "|" + pick(EYES, s, "e") + "|",
    "|" + pick(NOSES, s, "n") + "|",
    "|" + pick(MOUTHS, s, "m") + "|",
    "'--------'",
  ].join("\n");
}
