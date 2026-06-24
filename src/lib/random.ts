// Small randomizers for the wizard's "randomize" / quick-fill affordances.

const FIRST_NAMES = [
  "matthew",
  "sara",
  "jordan",
  "amara",
  "diego",
  "priya",
  "noah",
  "lena",
  "omar",
  "yuki",
  "carla",
  "tom",
];

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";

export const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const char = (s: string) => s.charAt(Math.floor(Math.random() * s.length));

/** Code like "a1b2" — letter, digit, letter, digit. */
export function randomCode(): string {
  return char(LETTERS) + char(DIGITS) + char(LETTERS) + char(DIGITS);
}

/** Profile name like "matthew-a1b2". */
export function randomProfileName(): string {
  return `${randomFrom(FIRST_NAMES)}-${randomCode()}`;
}
