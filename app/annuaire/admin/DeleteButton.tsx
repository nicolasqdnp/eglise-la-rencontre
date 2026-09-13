'use client'

import { deleteEntrepreneur } from '../actions'

export function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteEntrepreneur}
      onSubmit={e => {
        if (!confirm('Supprimer définitivement cette fiche ?')) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="px-4 py-2 rounded-xl border border-red-200 text-red-400 font-sans text-xs font-medium hover:bg-red-50 transition-colors"
      >
        Supprimer
      </button>
    </form>
  )
}
