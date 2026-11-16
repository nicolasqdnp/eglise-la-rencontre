import { describe, it, expect } from 'vitest'
import { getKeyOptions } from './songKeys'

describe('getKeyOptions', () => {
  it('place la tonalité courante en premier puis celle d\'origine', () => {
    const opts = getKeyOptions('G', ['G', 'A'], 'A')
    expect(opts.slice(0, 2)).toEqual(['A', 'G'])
  })

  it('ne contient aucun doublon', () => {
    const opts = getKeyOptions('G', ['G', 'D', 'G'], 'G')
    expect(new Set(opts).size).toBe(opts.length)
  })

  it('conserve une tonalité courante exotique absente des listes', () => {
    expect(getKeyOptions('G', [], 'Gm')).toContain('Gm')
  })

  it('propose les tonalités courantes même sans tonalité d\'origine ni courante', () => {
    const opts = getKeyOptions(null, undefined, null)
    expect(opts).toEqual(expect.arrayContaining(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Bb']))
  })

  it('ignore les valeurs vides', () => {
    expect(getKeyOptions('', ['', '  '], '')).not.toContain('')
  })
})
