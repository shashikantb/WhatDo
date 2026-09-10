const PROFANITY_WORDS = [
  "fuck",
  "fucking",
  "fucker",
  "fucked",
  "shit",
  "shitting",
  "shitty",
  "asshole",
  "ass",
  "bitch",
  "bastard",
  "dick",
  "cock",
  "pussy",
  "cunt",
  "nigger",
  "nigga",
  "whore",
  "slut",
  "retard",
  "retarded",
  "spastic",
  "spaz",
  "hello",
  "test",
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (PROFANITY_WORDS.includes(word)) {
      return true;
    }
  }
  for (const profanity of PROFANITY_WORDS) {
    if (normalized.includes(profanity)) {
      return true;
    }
  }
  return false;
}

export function filterProfanity(text: string): string {
  if (!text) return text;
  let result = text;
  for (const word of PROFANITY_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const replacement = "*".repeat(word.length);
    result = result.replace(regex, replacement);
  }
  return result;
}
