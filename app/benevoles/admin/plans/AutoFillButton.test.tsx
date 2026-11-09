import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'

const { computeMock, commitMock, stableRouter } = vi.hoisted(() => ({
  computeMock: vi.fn(),
  commitMock: vi.fn(),
  stableRouter: { push: vi.fn(), refresh: vi.fn() },
}))

vi.mock('./autofill/computeAutoFill', () => ({ computeAutoFillProposal: computeMock }))
vi.mock('./autofill/commitAutoFill', () => ({ commitAutoFillProposal: commitMock }))
vi.mock('next/navigation', () => ({ useRouter: () => stableRouter }))

const { AutoFillButton } = await import('./AutoFillButton')

afterEach(() => { cleanup(); vi.clearAllMocks() })

const PROPOSAL = {
  planId: 'plan-1', serviceDate: '2026-12-06T10:00:00.000Z', teamId: 'team-1', teamName: 'Louange',
  positionId: 'pos-1', positionName: 'Guitare', allowMultiple: false, userId: 'u1', userName: 'Alice A', alternatives: [],
}

async function openAndGenerate() {
  fireEvent.click(screen.getByRole('button', { name: /Auto-remplissage/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Générer' }))
}

describe('AutoFillButton — périmètre « équipes dont on est responsable »', () => {
  it('rappelle à un éditeur que seules ses équipes sont planifiées', () => {
    render(<AutoFillButton ledTeamsOnly />)
    fireEvent.click(screen.getByRole('button', { name: /Auto-remplissage/ }))
    expect(screen.getByText('Seules les équipes dont vous êtes responsable sont planifiées.')).toBeInTheDocument()
  })

  it('ne dit rien de tel à un administrateur', () => {
    render(<AutoFillButton />)
    fireEvent.click(screen.getByRole('button', { name: /Auto-remplissage/ }))
    expect(screen.queryByText(/dont vous êtes responsable/)).toBeNull()
  })

  it("liste dans l'aperçu les équipes réellement planifiées", async () => {
    computeMock.mockResolvedValue({ ok: true, proposals: [PROPOSAL], skipped: [], scopeTeamNames: ['Louange', 'Production'] })
    render(<AutoFillButton ledTeamsOnly />)
    await openAndGenerate()

    expect(await screen.findByText('Équipes planifiées : Louange, Production')).toBeInTheDocument()
  })

  it("n'affiche aucune restriction dans l'aperçu d'un administrateur (scopeTeamNames = null)", async () => {
    computeMock.mockResolvedValue({ ok: true, proposals: [PROPOSAL], skipped: [], scopeTeamNames: null })
    render(<AutoFillButton />)
    await openAndGenerate()

    expect(await screen.findByText(/1 poste proposé/)).toBeInTheDocument()
    expect(screen.queryByText(/Équipes planifiées/)).toBeNull()
  })

  it("affiche le refus du serveur (éditeur sans équipe dirigée) et reste sur l'écran de configuration", async () => {
    computeMock.mockResolvedValue({ ok: false, error: "Vous n'êtes responsable d'aucune équipe : l'auto-remplissage ne planifie que les équipes dont vous êtes responsable." })
    render(<AutoFillButton ledTeamsOnly />)
    await openAndGenerate()

    expect(await screen.findByText(/responsable d'aucune équipe/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Générer' })).toBeInTheDocument()
  })

  it('un refus à la validation (poste hors périmètre) est affiché et ne ferme pas l’aperçu', async () => {
    computeMock.mockResolvedValue({ ok: true, proposals: [PROPOSAL], skipped: [], scopeTeamNames: ['Louange'] })
    commitMock.mockResolvedValue({ ok: false, error: "Vous n'êtes pas responsable de l'équipe « Accueil » : validation refusée." })
    render(<AutoFillButton ledTeamsOnly />)
    await openAndGenerate()
    fireEvent.click(await screen.findByRole('button', { name: /Valider \(1\)/ }))

    await waitFor(() => expect(screen.getByText(/pas responsable de l'équipe « Accueil »/)).toBeInTheDocument())
    expect(stableRouter.refresh).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Valider \(1\)/ })).toBeInTheDocument()
  })
})

describe('AutoFillButton — choix des équipes à remplir', () => {
  const TEAMS = [
    { id: 'team-1', name: 'Louange', isMember: true },
    { id: 'team-2', name: 'Accueil', isMember: false },
    { id: 'team-3', name: 'Son', isMember: true },
  ]
  const okResult = { ok: true, proposals: [PROPOSAL], skipped: [], scopeTeamNames: ['Louange'] }

  function openModal(teams = TEAMS) {
    render(<AutoFillButton teams={teams} />)
    fireEvent.click(screen.getByRole('button', { name: /Auto-remplissage/ }))
  }

  it('coche par défaut uniquement les équipes dont on est membre et les envoie au serveur', async () => {
    computeMock.mockResolvedValue(okResult)
    openModal()
    expect(screen.getByRole('checkbox', { name: 'Louange' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Son' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Accueil' })).not.toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: 'Générer' }))
    await screen.findByText(/1 poste proposé/)
    expect(computeMock).toHaveBeenCalledWith(expect.any(String), expect.any(String), ['team-1', 'team-3'])
  })

  it('permet de cocher une équipe dont on ne fait pas partie', async () => {
    computeMock.mockResolvedValue(okResult)
    openModal()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Accueil' }))
    fireEvent.click(screen.getByRole('button', { name: 'Générer' }))

    await screen.findByText(/1 poste proposé/)
    expect(computeMock).toHaveBeenCalledWith(expect.any(String), expect.any(String), ['team-1', 'team-3', 'team-2'])
  })

  it("rien n'est coché si on n'est membre d'aucune équipe : « Générer » reste désactivé", () => {
    openModal(TEAMS.map(t => ({ ...t, isMember: false })))
    expect(screen.getByRole('button', { name: 'Générer' })).toBeDisabled()
  })

  it('« Tout sélectionner » puis « Tout désélectionner »', () => {
    openModal()
    fireEvent.click(screen.getByRole('button', { name: 'Tout sélectionner' }))
    expect(screen.getByRole('checkbox', { name: 'Accueil' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Tout désélectionner' }))
    expect(screen.getByRole('button', { name: 'Générer' })).toBeDisabled()
  })
})
