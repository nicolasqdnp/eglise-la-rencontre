'use client'

import { useState } from 'react'

type ParsedSong = {
  title:  string
  artist: string | null
  key:    string | null
  bpm:    number | null
  chart:  string
}

type Props = {
  onImport: (song: ParsedSong) => void
}

export function LtcAsaphImport({ onImport }: Props) {
  const [open, setOpen]                   = useState(false)
  const [query, setQuery]                 = useState('')
  const [results, setResults]             = useState<{ id: number; title: string; authors: string }[]>([])
  const [loading, setLoading]             = useState(false)
  const [fetchingId, setFetchingId]       = useState<number | null>(null)
  const [error, setError]                 = useState<string | null>(null)

  async function search() {
    if (!query.trim()) return
    setLoading(true); setError(null); setResults([])
    try {
      const res  = await fetch(`/api/ltcasaph?action=search&q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.results ?? [])
      if ((data.results ?? []).length === 0) setError('Aucun résultat.')
    } catch { setError('Erreur de connexion.') }
    finally { setLoading(false) }
  }

  async function importSong(id: number, title: string) {
    setFetchingId(id); setError(null)
    try {
      const res  = await fetch(`/api/ltcasaph?action=fetch&id=${id}`)
      const data = await res.json()
      if (data.error) { setError(`Impossible d'importer "${title}".`); return }
      onImport({
        title:  data.title  || title,
        artist: data.authors || null,
        key:    data.key    || null,
        bpm:    data.bpm    || null,
        chart:  data.chart  || '',
      })
      setOpen(false)
    } catch { setError("Erreur lors de l'import.") }
    finally { setFetchingId(null) }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-teal/20 bg-teal/5 hover:bg-teal/10 font-sans text-sm text-teal transition-colors"
      >
        🎵 Importer depuis LTC-Asaph
        <span className="font-sans text-xs text-teal/50">~5000 chants</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-teal/10">
              <div>
                <h2 className="font-display text-lg text-dark font-light">Importer depuis LTC-Asaph</h2>
                <p className="font-sans text-xs text-dark/40">~5000 chants chrétiens · paroles sans accords</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-dark/30 hover:text-dark text-xl">×</button>
            </div>

            {/* Search bar */}
            <div className="flex gap-2 px-4 py-3 border-b border-teal/10">
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="Titre du chant, auteur…"
                className="flex-1 border border-teal/20 rounded-lg px-3 py-2 font-sans text-sm text-dark placeholder:text-dark/30 focus:outline-none focus:border-teal/40"
              />
              <button
                onClick={search}
                disabled={loading || !query.trim()}
                className="px-4 py-2 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal/90 disabled:opacity-40"
              >
                {loading ? '…' : 'Chercher'}
              </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {error && (
                <p className="font-sans text-sm text-dark/40 text-center py-8">{error}</p>
              )}
              {loading && !error && (
                <p className="font-sans text-xs text-dark/30 text-center py-8">Chargement…</p>
              )}
              {!loading && results.map(r => (
                <button
                  key={r.id}
                  onClick={() => importSong(r.id, r.title)}
                  disabled={fetchingId !== null}
                  className="w-full text-left px-5 py-3 hover:bg-teal/5 transition-colors border-b border-teal/5 flex items-center justify-between group"
                >
                  <span>
                    <span className="font-sans text-sm text-dark group-hover:text-teal transition-colors block">
                      {r.title}
                    </span>
                    {r.authors && (
                      <span className="font-sans text-xs text-dark/40">{r.authors}</span>
                    )}
                  </span>
                  <span className="font-sans text-xs text-teal/50 shrink-0 ml-3">
                    {fetchingId === r.id ? '⏳ Import…' : 'Importer →'}
                  </span>
                </button>
              ))}
            </div>

            {/* Note copyright */}
            <p className="font-sans text-[10px] text-dark/25 text-center px-4 py-2 border-t border-teal/5">
              Contenu fourni par LTC-Asaph · Droits réservés aux auteurs · Usage interne uniquement
            </p>
          </div>
        </div>
      )}
    </>
  )
}
