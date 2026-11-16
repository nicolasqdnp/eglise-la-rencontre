/** Tonalités proposées par défaut quand un arrangement n'en liste pas explicitement. */
const COMMON_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Bb', 'Eb', 'Ab', 'Db', 'F#']

/**
 * Liste (sans doublon) des tonalités proposées pour changer la tonalité d'un chant dans un plan.
 * Ordre : tonalité courante, tonalité d'origine, tonalités déclarées de l'arrangement,
 * puis les tonalités courantes. La tonalité courante est toujours présente (même exotique),
 * pour que le sélecteur n'affiche jamais une valeur absente de ses options.
 */
export function getKeyOptions(
  originalKey: string | null | undefined,
  keysAvailable: string[] | null | undefined,
  currentKey: string | null | undefined,
): string[] {
  const out: string[] = []
  const push = (k: string | null | undefined) => {
    const key = k?.trim()
    if (key && !out.includes(key)) out.push(key)
  }
  push(currentKey)
  push(originalKey)
  ;(keysAvailable ?? []).forEach(push)
  COMMON_KEYS.forEach(push)
  return out
}
