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

const LAST_NAMES = [
  "reyes",
  "okoro",
  "nakamura",
  "bennett",
  "fontaine",
  "kapoor",
  "vasquez",
  "lindqvist",
  "halloran",
  "moreau",
  "delgado",
  "castillo",
  "petrov",
  "sundqvist",
];

const ALNUM = "abcdefghijklmnopqrstuvwxyz0123456789";

export const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const char = (s: string) => s.charAt(Math.floor(Math.random() * s.length));

/** Short code, max 3 chars — random mix of letters and digits, e.g. "a1e". */
export function randomCode(): string {
  return char(ALNUM) + char(ALNUM) + char(ALNUM);
}

/** Profile name like "matthew-reyes-a1e". */
export function randomProfileName(): string {
  return `${randomFrom(FIRST_NAMES)}-${randomFrom(LAST_NAMES)}-${randomCode()}`;
}
