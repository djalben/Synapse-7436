/**
 * Russian stress validator for song lyrics.
 * 
 * Takes GPT-generated lyrics and:
 * 1. Auto-fixes words missing stress marks using the dictionary
 * 2. Flags ambiguous words for user review
 * 3. Returns validation stats
 */

import { STRESS_MAP, AMBIGUOUS, VOWELS } from "./stress-dictionary"

export interface StressValidationResult {
  /** Lyrics with auto-fixed stresses */
  text: string
  /** Number of words checked against dictionary */
  checkedCount: number
  /** Number of words auto-fixed (stress added) */
  fixedCount: number
  /** Ambiguous words found — user should review */
  ambiguousWords: { word: string; options: string[] }[]
}

/** Check if a word already has a stress mark (any uppercase vowel) */
function hasStressMark(word: string): boolean {
  for (const ch of word) {
    if (ch >= "А" && ch <= "Я" && VOWELS.has(ch.toLowerCase())) {
      return true
    }
    // Also check Ё
    if (ch === "Ё") return true
  }
  return false
}

/** Count vowels in a lowercase word */
function vowelCount(word: string): number {
  let count = 0
  for (const ch of word) {
    if (VOWELS.has(ch)) count++
  }
  return count
}

/**
 * Apply stress mark to a word given the stressed vowel index.
 * stressIdx = index among vowels (0-based).
 * Returns the word with that vowel uppercased.
 */
function applyStress(word: string, stressIdx: number): string {
  let vowelsSeen = 0
  let result = ""
  for (const ch of word) {
    if (VOWELS.has(ch.toLowerCase())) {
      if (vowelsSeen === stressIdx) {
        result += ch.toUpperCase()
      } else {
        result += ch.toLowerCase()
      }
      vowelsSeen++
    } else {
      result += ch
    }
  }
  return result
}

/**
 * Extract the "clean" lowercase form of a word (strip punctuation edges).
 * Returns [cleanWord, prefixPunct, suffixPunct]
 */
function cleanWord(token: string): [string, string, string] {
  const match = token.match(/^([^а-яёА-ЯЁ]*)(.*?)([^а-яёА-ЯЁ]*)$/)
  if (!match) return [token, "", ""]
  return [match[2], match[1], match[3]]
}

/**
 * Validate and auto-fix stresses in lyrics text.
 */
export function validateStresses(lyrics: string): StressValidationResult {
  let checkedCount = 0
  let fixedCount = 0
  const ambiguousWords: { word: string; options: string[] }[] = []
  const seenAmbiguous = new Set<string>()

  // Process line by line to preserve structure
  const lines = lyrics.split("\n")
  const processedLines = lines.map((line) => {
    // Skip section markers like [Verse 1], [Chorus], etc.
    if (/^\s*\[.*\]\s*$/.test(line)) return line

    const tokens = line.split(/(\s+)/)
    const processedTokens = tokens.map((token) => {
      // Whitespace — pass through
      if (/^\s*$/.test(token)) return token

      const [word, prefix, suffix] = cleanWord(token)
      if (!word) return token

      const lower = word.toLowerCase()

      // Skip words with only 1 vowel (stress is obvious)
      if (vowelCount(lower) <= 1) return token

      // Check ambiguity first
      if (AMBIGUOUS[lower] && !seenAmbiguous.has(lower)) {
        seenAmbiguous.add(lower)
        ambiguousWords.push({ word: lower, options: AMBIGUOUS[lower] })
        // Don't auto-fix ambiguous words — leave as-is or with GPT's stress
        return token
      }

      // Check dictionary
      const stressIdx = STRESS_MAP[lower]
      if (stressIdx !== undefined) {
        checkedCount++

        // If word already has correct stress mark, skip
        if (hasStressMark(word)) return token

        // Auto-fix: apply stress from dictionary
        const fixed = applyStress(word, stressIdx)
        fixedCount++
        return prefix + fixed + suffix
      }

      // Word not in dictionary — leave as-is (GPT's marking)
      return token
    })

    return processedTokens.join("")
  })

  return {
    text: processedLines.join("\n"),
    checkedCount,
    fixedCount,
    ambiguousWords,
  }
}
