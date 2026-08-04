const LETTER_GROUP_RULES = [
  [/sch/g, "ch"],
  [/tch/g, "ch"],

  [/ph/g, "f"],

  [/ck/g, "k"],
  [/cq/g, "k"],
  [/qu/g, "k"],

  // Silent "gh" in many Germanic words.
  [/gh(?![aeiou])/g, ""],
]

const VOWEL_RULES = [
  [/eau/g, "o"],
  [/au/g, "o"],

  [/oo/g, "u"],
  [/ou/g, "u"],

  [/ee/g, "i"],
  [/ea/g, "i"],

  [/ei/g, "e"],
  [/ai/g, "e"],
  [/ay/g, "e"],
  [/ey/g, "e"],

  [/oe/g, "e"],
]

const CONSONANT_RULES = [
  // Soft c / g.
  [/c([eiy])/g, "s$1"],
  [/g([eiy])/g, "j$1"],

  // Hard c / q.
  [/c/g, "k"],
  [/q/g, "k"],

  [/x/g, "ks"],
  [/z/g, "s"],

  // Common European pronunciation.
  [/w/g, "v"],
  [/y/g, "i"],
]

const ENDING_RULES = [
  // English gerund.
  [/ings?$/, "in"],

  // French infinitive.
  [/er$/, "e"],

  // Basic singularization.
  [/es$/, "e"],
  [/s$/, ""],
]

const NORMALIZATION_RULES = [
  ...LETTER_GROUP_RULES,
  ...VOWEL_RULES,
  ...CONSONANT_RULES,
  ...ENDING_RULES,
]

const RE_DIACRITICS = /[\u0300-\u036f]/g
const RE_DUPLICATES = /([a-z])\1+/g
const RE_NON_ALNUM = /[^a-z0-9]/g
const RE_REPLACE_SPACES = /\s+/g

const tokenCache = new Map()

const normalizeToken = (value) => {
  if (tokenCache.has(value)) {
    return tokenCache.get(value)
  }
  let normalized = value
    // Normalize Unicode characters (remove diacritics).
    .normalize("NFD")
    .replace(RE_DIACRITICS, "")

    // Expand common ligatures.
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")

    // Convert to lowercase.
    .toLowerCase()

    // Keep alphanumeric characters only.
    .replace(RE_NON_ALNUM, "")

    // Drop an initial silent "h".
    .replace(/^h(?=[aeiou])/, "")

    // Collapse repeated letters.
    .replace(RE_DUPLICATES, "$1")

  for (const [pattern, replacement] of NORMALIZATION_RULES) {
    normalized = normalized.replace(pattern, replacement)
  }

  // Collapse any repeated letters introduced by previous replacements.
  normalized = normalized.replace(RE_DUPLICATES, "$1")

  if (tokenCache.size > 10000) {
    tokenCache.clear()
  }
  tokenCache.set(value, normalized)

  return normalized
}

export const normalize = (value) =>
  value.replace(/\S+/g, normalizeToken).replace(RE_REPLACE_SPACES, "_")
