'use client'

import { useState, useTransition } from 'react'
import { updatePlanSongKey } from '../actions'
import { getKeyOptions } from '@/lib/songKeys'

type Props = {
  planId: string
  planSongId: string
  /** Tonalité actuellement choisie pour ce chant dans le plan. */
  value: string | null
  /** Tonalité d'origine de l'arrangement (repli si aucune tonalité choisie). */
  originalKey: string | null
  keysAvailable?: string[] | null
  /** Notifie le parent (mise à jour optimiste) dès que la tonalité change. */
  onChange?: (key: string) => void
}

/** Sélecteur permettant de changer, après coup, la tonalité d'un chant déjà ajouté au plan. */
export function PlanSongKeySelect({ planId, planSongId, value, originalKey, keysAvailable, onChange }: Props) {
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const current = value ?? originalKey ?? ''
  const options = getKeyOptions(originalKey, keysAvailable, current)

  function handleChange(next: string) {
    if (!next || next === current) return
    const previous = current
    setError(null)
    onChange?.(next)
    startTransition(async () => {
      const res = await updatePlanSongKey(planSongId, next, planId)
      if (!res.ok) {
        setError(res.error ?? 'Erreur')
        onChange?.(previous) // annule la mise à jour optimiste
      }
    })
  }

  return (
    <span className="inline-flex flex-col items-end shrink-0">
      <select
        aria-label="Tonalité"
        value={current}
        onChange={e => handleChange(e.target.value)}
        onClick={e => e.stopPropagation()}
        className="w-16 bg-white border border-teal/20 rounded-lg px-1.5 py-1 font-sans text-xs text-teal font-medium focus:outline-none focus:ring-1 focus:ring-teal/30"
      >
        {!current && <option value="">Ton.</option>}
        {options.map(k => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>
      {error && <span role="alert" className="font-sans text-[10px] text-red-500">{error}</span>}
    </span>
  )
}
