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

// Cleans typographical glitches: normalizes apostrophes and collapses spaces
export const cleanText = (value) => {
  if (typeof value !== "string") return value
  return value
    .replace(/[’´`]/g, "'")
    .replace(/'\s+/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

export const normalize = (value) => {
  if (typeof value !== "string") return ""
  return cleanText(value)
    .replace(/\S+/g, normalizeToken)
    .replace(RE_REPLACE_SPACES, "_")
}

// Checks if the string contains at least one Latin letter
export const hasLatinLetter = (value) =>
  typeof value === "string" && /\p{Script=Latin}/u.test(value)

// Checks if the string contains at least one letter that is NOT Latin
export const hasNonLatinLetter = (value) =>
  typeof value === "string" &&
  Array.from(value).some(
    (char) => /\p{L}/u.test(char) && !/\p{Script=Latin}/u.test(char),
  )

// Formats numeric rating without trailing zeros for whole numbers
export const formatRating = (value, maxDecimals = 2) => {
  if (typeof value !== "number" || isNaN(value)) return ""
  return Number(value.toFixed(maxDecimals)).toString()
}

// Sanitizes price string or number to standard decimal format with a dot
export const cleanPrice = (value) => {
  if (value === undefined || value === null) return ""
  const str = String(value).trim()
  if (!str) return ""
  const match = str.match(/(\d+(?:[.,]\d+)?)/)
  return match ? match[1].replace(",", ".") : ""
}

// Canonical item field names across data providers and apps
export const FIELD_PLACE = "place"
export const FIELD_PRICE = "price"
export const FIELD_CATEGORIES = "categories"
export const FIELD_RATING = "rating"

// Supported multilingual and semantic aliases for canonical fields in freeform text
export const FIELD_ALIASES = {
  [FIELD_PLACE]: ["place", "places", "emplacement", "emplacements"],
  [FIELD_PRICE]: ["price", "prices", "prix"],
  [FIELD_RATING]: ["rating", "ratings", "rate", "rates", "note", "notes"],
  [FIELD_CATEGORIES]: [
    "categories",
    "category",
    "cat",
    "genre",
    "genres",
    "style",
    "styles",
  ],
}

// Resolves tag or canonical field name to a list of matching alias strings
const resolveTagPatterns = (tag) => {
  if (Array.isArray(tag)) {
    return tag.map((t) => String(t).trim()).filter(Boolean)
  }
  if (!tag) return []
  const str = String(tag).trim()
  if (FIELD_ALIASES[str]) {
    return FIELD_ALIASES[str]
  }
  return [str]
}

// Builds regex matching any recognized alias of a tag bounded by delimiters
const buildTagRegex = (tag) => {
  const patterns = resolveTagPatterns(tag)
  if (patterns.length === 0) return null
  const escaped = patterns
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")
  return new RegExp(
    `(?:^|[\\r\\n;,|])\\s*(?:${escaped}):\\s*([^\\r\\n;|]+?)(?=\\s*[,;]?\\s*[\\w-]+:\\s*|[\\r\\n;|]|$)`,
    "i",
  )
}

// Extracts a tagged value or any of its aliases from freeform text
export const extractTag = (text, tag) => {
  if (!text || !tag || typeof text !== "string") return undefined
  const regex = buildTagRegex(tag)
  if (!regex) return undefined
  const match = text.match(regex)
  return match ? match[1].trim() : undefined
}

// Updates, appends, or removes a tagged value (matching any aliases) in text
export const updateTag = (text, tag, value) => {
  if (!tag) return text || ""
  const regex = buildTagRegex(tag)
  if (!regex) return text || ""

  if (value === undefined || value === null || value === "") {
    return (text || "")
      .replace(regex, "")
      .replace(/^[\r\n;,|\s]+|[\r\n;,|\s]+$/g, "")
  }

  const tagFormatted = `${tag}: ${value}`
  if (regex.test(text || "")) {
    return (text || "").replace(regex, (match) => {
      const firstChar = match.charAt(0)
      const prefix = /[\r\n;,|]/.test(firstChar) ? firstChar + " " : ""
      return `${prefix}${tagFormatted}`
    })
  }

  const trimmed = (text || "").trim()
  if (!trimmed) return tagFormatted
  const separator = /[\r\n;,|]$/.test(trimmed) ? " " : ", "
  return `${trimmed}${separator}${tagFormatted}`
}
