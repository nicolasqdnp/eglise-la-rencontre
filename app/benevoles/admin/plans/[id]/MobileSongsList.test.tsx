import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'

const { keyMock } = vi.hoisted(() => ({
  keyMock: vi.fn(async (..._args: any[]) => ({ ok: true })),
}))
vi.mock('../actions', () => ({
  reorderPlanSongs: vi.fn(),
  removePlanSong: vi.fn(),
  updatePlanSongKey: keyMock,
}))
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}))

const { MobileSongsList } = await import('./MobileSongsList')

afterEach(() => { cleanup(); keyMock.mockClear() })

const songs = [
  { id: 'ps-1', key_selected: 'G', songs: { id: 1, title: 'Grâce infinie' }, arrangements: { chord_chart_key: 'G', keys_available: ['G', 'A'] } },
  { id: 'ps-2', key_selected: null, songs: { id: 2, title: 'Roi de gloire' }, arrangements: { chord_chart_key: 'D', keys_available: [] } },
]

describe('MobileSongsList — changement de tonalité après coup', () => {
  it('affiche un sélecteur de tonalité par chant, pré-rempli', () => {
    render(<MobileSongsList planId="plan-1" planSongs={songs as any} />)
    const selects = screen.getAllByLabelText('Tonalité') as HTMLSelectElement[]
    expect(selects.map(s => s.value)).toEqual(['G', 'D'])
  })

  it('met à jour immédiatement et enregistre la nouvelle tonalité', async () => {
    render(<MobileSongsList planId="plan-1" planSongs={songs as any} />)
    const [first] = screen.getAllByLabelText('Tonalité') as HTMLSelectElement[]
    fireEvent.change(first, { target: { value: 'A' } })
    expect((screen.getAllByLabelText('Tonalité')[0] as HTMLSelectElement).value).toBe('A')
    await waitFor(() => expect(keyMock).toHaveBeenCalledWith('ps-1', 'A', 'plan-1'))
  })
})
