/**
 * RussianLinguist — utility for automatic stress marks in Russian text.
 *
 * addStresses(text) inserts '+' before the stressed vowel in critical names
 * and common homographs (words that look identical but have different stress).
 *
 * This is used by TTS pipelines to improve pronunciation accuracy.
 */

// ── Critical names & proper nouns: word → stressed form with '+' ──
const NAME_STRESSES: Record<string, string> = {
  "платон":   "Плат+он",
  "платона":  "Плат+она",
  "платону":  "Плат+ону",
  "платоном": "Плат+оном",
  "платоне":  "Плат+оне",
  "ариадна":  "Ари+адна",
  "ариадны":  "Ари+адны",
  "ариадне":  "Ари+адне",
  "ариадну":  "Ари+адну",
  "ариадной": "Ари+адной",
  "одиссей":  "Одисс+ей",
  "одиссея":  "Одисс+ея",
  "персефона":  "Персеф+она",
  "персефоны":  "Персеф+оны",
  "персефоне":  "Персеф+оне",
  "деметра":  "Дем+етра",
  "афродита": "Афрод+ита",
  "афродиты": "Афрод+иты",
  "артемида": "Артем+ида",
  "артемиды": "Артем+иды",
  "геракл":   "Гер+акл",
  "геракла":  "Гер+акла",
  "аполлон":  "Аполл+он",
  "аполлона": "Аполл+она",
  "посейдон": "Посейд+он",
  "посейдона":"Посейд+она",
  "елена":    "Ел+ена",
  "елены":    "Ел+ены",
  "василиса": "Васил+иса",
  "василисы": "Васил+исы",
  "кощей":    "Кощ+ей",
  "кощея":    "Кощ+ея",
  "баба-яга": "Баба-Яг+а",
}

// ── Homographs: lowercase → stressed form ──
// Only unambiguous high-frequency cases where TTS often fails
const HOMOGRAPH_STRESSES: Record<string, string> = {
  "замок":    "з+амок",     // castle (default; "lock" is зам+ок — context-dependent)
  "мука":     "м+ука",      // flour (default)
  "атлас":    "+атлас",     // atlas/map
  "орган":    "+орган",     // body organ
  "хлопок":   "хл+опок",   // cotton
  "ирис":     "+ирис",     // iris flower
  "стрелки":  "стр+елки",  // arrows/hands of clock
  "белки":    "б+елки",    // squirrels
  "село":     "сел+о",     // village
  "дорога":   "дор+ога",   // road
  "пропасть": "пр+опасть", // abyss
  "полки":    "п+олки",    // shelves
}

/**
 * Add stress marks to Russian text for TTS pronunciation accuracy.
 * Inserts '+' before the stressed vowel in known names and homographs.
 *
 * @param text — input Russian text
 * @returns text with '+' stress marks inserted
 */
export function addStresses(text: string): string {
  // Build a combined lookup (names take priority)
  const lookup: Record<string, string> = { ...HOMOGRAPH_STRESSES, ...NAME_STRESSES }

  return text.replace(/[а-яА-ЯёЁ]+(-[а-яА-ЯёЁ]+)*/g, (match) => {
    const key = match.toLowerCase()
    const replacement = lookup[key]
    if (!replacement) return match

    // Preserve original casing of the first letter
    if (match[0] === match[0].toUpperCase() && replacement[0] !== match[0].toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1)
    }
    return replacement
  })
}

/**
 * System prompt addition for stress-aware Russian responses.
 * Append this to any chat system prompt when high pronunciation accuracy is needed.
 */
export const STRESS_INSTRUCTION = `При ответе на русском языке, если контекст требует высокой точности произношения (имена собственные, сложные термины, омографы), используй символ + перед ударной гласной. Примеры: Плат+он, Ари+адна, з+амок (крепость), зам+ок (дверной). Это помогает системе озвучки правильно расставлять ударения.`
