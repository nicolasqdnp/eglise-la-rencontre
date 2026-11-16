import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'

const { keyMock } = vi.hoisted(() => ({
  keyMock: vi.fn(async (..._args: any[]): Promise<{ ok: boolean; error?: string }> => ({ ok: true })),
}))
vi.mock('../actions', () => ({ updatePlanSongKey: keyMock }))

const { PlanSongKeySelect } = await import('./PlanSongKeySelect')

afterEach(cleanup)
beforeEach(() => keyMock.mockClear())

function setup(props: Partial<React.ComponentProps<typeof PlanSongKeySelect>> = {}) {
  const onChange = vi.fn()
  render(
    <PlanSongKeySelect
      planId="plan-1" planSongId="ps-1" value="G" originalKey="G" keysAvailable={['G', 'A']}
      onChange={onChange} {...props}
    />,
  )
  return { onChange, select: screen.getByLabelText('Tonalité') as HTMLSelectElement }
}

describe('PlanSongKeySelect', () => {
  it('affiche la tonalité actuelle', () => {
    const { select } = setup({ value: 'A' })
    expect(select.value).toBe('A')
  })

  it("se rabat sur la tonalité d'origine quand aucune tonalité n'est choisie", () => {
    const { select } = setup({ value: null, originalKey: 'D' })
    expect(select.value).toBe('D')
  })

  it('enregistre la nouvelle tonalité avec le plan et notifie le parent', async () => {
    const { select, onChange } = setup()
    fireEvent.change(select, { target: { value: 'A' } })
    expect(onChange).toHaveBeenCalledWith('A')
    await waitFor(() => expect(keyMock).toHaveBeenCalledWith('ps-1', 'A', 'plan-1'))
  })

  it("n'appelle pas le serveur si la tonalité est inchangée", () => {
    const { select } = setup()
    fireEvent.change(select, { target: { value: 'G' } })
    expect(keyMock).not.toHaveBeenCalled()
  })

  it("annule la mise à jour optimiste et affiche l'erreur si l'enregistrement échoue", async () => {
    keyMock.mockResolvedValueOnce({ ok: false, error: 'Boom' })
    const { select, onChange } = setup()
    fireEvent.change(select, { target: { value: 'A' } })
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Boom'))
    expect(onChange).toHaveBeenNthCalledWith(1, 'A')
    expect(onChange).toHaveBeenNthCalledWith(2, 'G')
  })
})
