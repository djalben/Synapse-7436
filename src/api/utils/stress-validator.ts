/**
 * Russian stress validator for song lyrics (v2 — minimal mode).
 * 
 * GPT now writes in normal lowercase. This validator:
 * 1. Counts how many words exist in our dictionary (confidence metric)
 * 2. Flags ambiguous words (замок/замОк etc.) for user review
 * 3. Does NOT bulk-capitalize — lyrics stay clean and readable
 */

import { STRESS_MAP, AMBIGUOUS, VOWELS } from "./stress-dictionary.js"

export interface StressValidationResult {
  /** Lyrics text (unchanged — no auto-caps in v2) */
  text: string
  /** Number of words found in dictionary (confidence metric) */
  checkedCount: number
  /** Number of words auto-fixed (only names/critical — minimal in v2) */
  fixedCount: number
  /** Ambiguous words found — user should review */
  ambiguousWords: { word: string; options: string[] }[]
}

/** Count vowels in a word */
function vowelCount(word: string): number {
  let count = 0
  for (const ch of word) {
    if (VOWELS.has(ch.toLowerCase())) count++
  }
  return count
}

/**
 * Extract the "clean" form of a word (strip punctuation edges).
 * Returns [cleanWord, prefixPunct, suffixPunct]
 */
function cleanWord(token: string): [string, string, string] {
  const match = token.match(/^([^а-яёА-ЯЁ]*)(.*?)([^а-яёА-ЯЁ]*)$/)
  if (!match) return [token, "", ""]
  return [match[2], match[1], match[3]]
}

/**
 * Validate lyrics — flag ambiguous words, count dictionary coverage.
 * No bulk auto-capitalization (v2 philosophy: GPT writes clean, system trusts it).
 */
export function validateStresses(lyrics: string): StressValidationResult {
  let checkedCount = 0
  const fixedCount = 0
  const ambiguousWords: { word: string; options: string[] }[] = []
  const seenAmbiguous = new Set<string>()

  const lines = lyrics.split("\n")
  for (const line of lines) {
    if (/^\s*\[.*\]\s*$/.test(line)) continue // skip markers

    const tokens = line.split(/\s+/)
    for (const token of tokens) {
      const [word] = cleanWord(token)
      if (!word) continue

      const lower = word.toLowerCase()
      if (vowelCount(lower) <= 1) continue // single-vowel = obvious stress

      // Flag ambiguous words
      if (AMBIGUOUS[lower] && !seenAmbiguous.has(lower)) {
        seenAmbiguous.add(lower)
        ambiguousWords.push({ word: lower, options: AMBIGUOUS[lower] })
      }

      // Count dictionary hits (confidence metric)
      if (STRESS_MAP[lower] !== undefined) {
        checkedCount++
      }
    }
  }

  return {
    text: lyrics, // unchanged — no auto-caps
    checkedCount,
    fixedCount,
    ambiguousWords,
  }
}
