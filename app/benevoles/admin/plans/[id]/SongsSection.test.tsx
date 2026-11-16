import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'

const { keyMock } = vi.hoisted(() => ({
  keyMock: vi.fn(async (..._args: any[]) => ({ ok: true })),
}))
vi.mock('../actions', () => ({
  removePlanSong: vi.fn(),
  movePlanSong: vi.fn(),
  reorderPlanSongs: vi.fn(),
  addPlanSong: vi.fn(),
  updatePlanSongKey: keyMock,
}))

const { SongsSection } = await import('./SongsSection')

afterEach(() => { cleanup(); keyMock.mockClear() })

const planSongs = [
  {
    id: 'ps-1', order_index: 0, key_selected: 'G',
    songs: { id: 1, title: 'Grâce infinie' },
    arrangements: { id: 'arr-1', name: 'Défaut', chord_chart: 'G    C\nGrâce infinie', chord_chart_key: 'G', keys_available: ['G', 'A'] },
  },
]

describe('SongsSection — changement de tonalité après coup', () => {
  it('change la tonalité depuis la liste et enregistre avec le plan', async () => {
    render(<SongsSection planId="plan-1" planSongs={planSongs as any} allSongs={[]} />)
    const [select] = screen.getAllByLabelText('Tonalité') as HTMLSelectElement[]
    fireEvent.change(select, { target: { value: 'A' } })
    await waitFor(() => expect(keyMock).toHaveBeenCalledWith('ps-1', 'A', 'plan-1'))
    expect((screen.getAllByLabelText('Tonalité')[0] as HTMLSelectElement).value).toBe('A')
  })

  it('la grille ouverte suit la tonalité changée depuis la liste', async () => {
    render(<SongsSection planId="plan-1" planSongs={planSongs as any} allSongs={[]} />)
    fireEvent.click(screen.getByText('Grâce infinie'))
    const pre = () => document.querySelector('pre')!.textContent
    expect(pre()).toContain('G    C')

    const [select] = screen.getAllByLabelText('Tonalité') as HTMLSelectElement[]
    fireEvent.change(select, { target: { value: 'A' } })
    await waitFor(() => expect(pre()).toContain('A    D'))
  })

  it("enregistre aussi le changement fait depuis la grille (boutons de tonalité)", async () => {
    render(<SongsSection planId="plan-1" planSongs={planSongs as any} allSongs={[]} />)
    fireEvent.click(screen.getByText('Grâce infinie'))
    fireEvent.click(screen.getByRole('button', { name: 'D' }))
    await waitFor(() => expect(keyMock).toHaveBeenCalledWith('ps-1', 'D', 'plan-1'))
  })
})
