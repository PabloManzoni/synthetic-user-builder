// Deterministic ASCII avatar for a synthetic user, seeded by the profile name.
//
// Goals: faces that are clearly DIFFERENT from each other, a little funny, and
// that match the apparent gender of the first name (women get long hair / buns,
// men short hair / mustaches), plus varied skin shading for diversity.
//
// Everything is plain single-width ASCII so each rendered line stays aligned in
// a monospace <pre>. Inner face is 7 chars wide; a 1-char "hair gutter" on each
// side (used for long hair / pigtails) keeps every line exactly 11 chars.

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const pick = <T>(arr: T[], seed: string, salt: string): T => arr[hash(seed + salt) % arr.length];
const chance = (seed: string, salt: string, pct: number) => hash(seed + salt) % 100 < pct;

// ---- Gender from the first name -------------------------------------------
// Known names from the generator are mapped explicitly; anything else falls back
// to a light ending-based heuristic so custom names still get a fitting face.
const FEMALE = new Set(["sara", "amara", "priya", "lena", "yuki", "carla", "mia", "anna", "sofia", "elena", "nina"]);
const MALE = new Set(["matthew", "jordan", "diego", "noah", "omar", "tom", "liam", "max", "leo", "ivan", "sam"]);

function genderOf(name: string): "f" | "m" {
  const first = (name.split("-")[0] || "").toLowerCase().trim();
  if (FEMALE.has(first)) return "f";
  if (MALE.has(first)) return "m";
  // Heuristic fallback: names ending in a/e/i/ya lean female.
  return /(a|e|i|ya|ah)$/.test(first) ? "f" : "m";
}

// ---- Hair (gendered) -------------------------------------------------------
// Each style: `top` is the hairline row (7 chars); `l`/`r` are the left/right
// gutter columns, one char per output line (7 lines: border,hair,brow,eyes,nose,
// mouth,border). Men's gutters are empty — short hair stays inside the box.
interface Hair {
  top: string;
  l: string;
  r: string;
}

const EMPTY = "       ";

const FEMALE_HAIR: Hair[] = [
  { top: "~~~~~~~", l: " ((((((", r: ")))))) " }, // long wavy
  { top: "ooooooo", l: " ))))) ", r: " ((((( " }, // curls
  { top: "_______", l: " ||||| ", r: " ||||| " }, // long straight
  { top: "wwwwwww", l: " }}}}} ", r: " {{{{{ " }, // long thick
  { top: "^^^^^^^", l: " O|    ", r: " |O    " }, // pigtails
  { top: ".-.-.-.", l: " 6     ", r: " 9     " }, // top buns
  { top: "/\\/\\/\\/", l: " ))))) ", r: " ((((( " }, // layered
];

const MALE_HAIR: Hair[] = [
  { top: "^^^^^^^", l: EMPTY, r: EMPTY }, // spiky
  { top: "#######", l: EMPTY, r: EMPTY }, // buzz cut
  { top: "///////", l: EMPTY, r: EMPTY }, // combover
  { top: "  ___  ", l: EMPTY, r: EMPTY }, // receding
  { top: "vvvvvvv", l: EMPTY, r: EMPTY }, // flat
  { top: "_______", l: EMPTY, r: EMPTY }, // neat
  { top: "*-*-*-*", l: EMPTY, r: EMPTY }, // messy
];

// ---- Features (7 chars; eyes at index 1 & 5, nose centered at 3) -----------
const BROWS = ["       ", " \\   / ", " /   \\ ", " ^   ^ ", " -   - ", " ~   ~ ", " .   . ", " v   v "];

const EYES = [
  " o   o ",
  " O   O ",
  " @   @ ",
  " *   * ",
  " ^   ^ ",
  " x   x ", // knocked out
  " o   - ", // wink
  " -   o ", // wink (other side)
  " 0   0 ",
  " q   p ",
  " >   < ", // squint
  " =   = ",
  " u   u ",
  " .   . ", // tiny
];

const GLASSES = ["[o] [o]", "(o) (o)", "[O]_[O]", "o-o o-o", "(=) (=)"];

const NOSES = ["   >   ", "   L   ", "   v   ", "   7   ", "   J   ", "   |   ", "   c   ", "   .   ", "  -.   "];

const MUSTACHES = [" {===} ", " /MMM\\ ", " ~mmm~ ", " >vvv< ", " ,===, "];

const MOUTHS = [
  " \\___/ ", // smile
  "  ---  ", // meh
  " \\www/ ", // big toothy grin
  " vvvvv ", // grin
  " ===== ", // flat line
  "  ___  ",
  " (___) ", // open
  "  ooo  ", // surprised "o"
  " >___< ",
  " \\^^^/ ",
  "  \\_/  ", // small smile
  " }WWW{ ", // bearded
];

// Skin shading — mostly clear, sometimes shaded for variety/diversity.
const SHADES = [" ", " ", " ", " ", " ", ".", ".", ":", ":", "#"];

const shadeRow = (row: string, shade: string) => (shade === " " ? row : row.replace(/ /g, shade));

/** Returns a 7-line ASCII face, deterministic for a given seed, gendered + varied. */
export function asciiFace(seed: string): string {
  const s = seed.trim() || "anon";
  const g = genderOf(s);
  const hair = pick(g === "f" ? FEMALE_HAIR : MALE_HAIR, s, "hair");
  const brow = pick(BROWS, s, "brow");
  const eyes = chance(s, "glass", 28) ? pick(GLASSES, s, "glass") : pick(EYES, s, "eyes");
  // Men sometimes get a mustache in place of the nose row.
  const nose = g === "m" && chance(s, "stash", 30) ? pick(MUSTACHES, s, "stash") : pick(NOSES, s, "nose");
  const mouth = pick(MOUTHS, s, "mouth");
  const shade = pick(SHADES, s, "shade");

  // Inner face rows (shaded), then framed with borders + hair gutters.
  const inner = [hair.top, brow, eyes, nose, mouth].map((row) => shadeRow(row, shade));
  const L = hair.l; // left gutter, one char per line
  const R = hair.r;

  return [
    L[0] + ".-------." + R[0],
    L[1] + "|" + inner[0] + "|" + R[1],
    L[2] + "|" + inner[1] + "|" + R[2],
    L[3] + "|" + inner[2] + "|" + R[3],
    L[4] + "|" + inner[3] + "|" + R[4],
    L[5] + "|" + inner[4] + "|" + R[5],
    L[6] + "'-------'" + R[6],
  ].join("\n");
}
