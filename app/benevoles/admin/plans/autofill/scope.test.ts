import { describe, it, expect } from 'vitest'
import { ok, makeFakeSupabase } from '@/test/helpers/fakeSupabase'
import { resolveAutoFillScope, narrowAutoFillScope, listAutoFillTeams } from './scope'

const adminWith = (team_members: ReturnType<typeof ok>[] | { data: null; error: { message: string } }[]) =>
  makeFakeSupabase({ team_members: team_members as never }) as never

describe('resolveAutoFillScope', () => {
  it.each(['admin', 'super_admin'])('un %s planifie toutes les équipes (aucune lecture de team_members)', async permission => {
    const admin = adminWith([])
    const scope = await resolveAutoFillScope(admin, 'u1', permission)
    expect(scope).toEqual({ ok: true, teamIds: null })
    expect((admin as unknown as { calls: string[] }).calls).toEqual([])
  })

  it('un éditeur est limité aux équipes dont il est responsable (dédoublonnées)', async () => {
    const scope = await resolveAutoFillScope(
      adminWith([ok([{ team_id: 'louange' }, { team_id: 'accueil' }, { team_id: 'louange' }])]), 'u1', 'editor')
    expect(scope).toEqual({ ok: true, teamIds: ['louange', 'accueil'] })
  })

  it("un éditeur qui n'est responsable d'aucune équipe ne peut rien planifier", async () => {
    const scope = await resolveAutoFillScope(adminWith([ok([])]), 'u1', 'editor')
    expect(scope.ok).toBe(false)
    if (!scope.ok) expect(scope.error).toMatch(/responsable d'aucune équipe/)
  })

  it('fail-closed : si la lecture échoue, on refuse (jamais de repli sur « toutes les équipes »)', async () => {
    const scope = await resolveAutoFillScope(adminWith([{ data: null, error: { message: 'timeout' } }]), 'u1', 'editor')
    expect(scope.ok).toBe(false)
    if (!scope.ok) expect(scope.error).toMatch(/timeout.*refusé par précaution/)
  })

  it('tout profil non administrateur (même inattendu) passe par la restriction', async () => {
    for (const permission of ['viewer', 'member', '', 'Admin']) {
      const scope = await resolveAutoFillScope(adminWith([ok([{ team_id: 'louange' }])]), 'u1', permission)
      expect(scope).toEqual({ ok: true, teamIds: ['louange'] })
    }
  })
})

describe('narrowAutoFillScope', () => {
  it('sans choix, garde tout le périmètre autorisé', () => {
    expect(narrowAutoFillScope(null, undefined)).toEqual({ ok: true, teamIds: null })
    expect(narrowAutoFillScope(['a', 'b'], undefined)).toEqual({ ok: true, teamIds: ['a', 'b'] })
  })

  it('un admin (périmètre null) peut choisir n’importe quelles équipes', () => {
    expect(narrowAutoFillScope(null, ['a', 'a', 'c'])).toEqual({ ok: true, teamIds: ['a', 'c'] })
  })

  it('un éditeur peut choisir un sous-ensemble de ses équipes', () => {
    expect(narrowAutoFillScope(['a', 'b'], ['b'])).toEqual({ ok: true, teamIds: ['b'] })
  })

  it('refuse toute équipe hors périmètre, même mélangée à des équipes autorisées', () => {
    const r = narrowAutoFillScope(['a', 'b'], ['a', 'z'])
    expect(r.ok).toBe(false)
  })

  it('refuse une sélection vide (jamais de repli sur « tout »)', () => {
    expect(narrowAutoFillScope(null, []).ok).toBe(false)
    expect(narrowAutoFillScope(['a'], []).ok).toBe(false)
  })
})

describe('listAutoFillTeams', () => {
  it('un admin obtient toutes les équipes, avec isMember pour celles dont il fait partie', async () => {
    const admin = makeFakeSupabase({
      teams: [ok([{ id: 't1', name: 'Accueil' }, { id: 't2', name: 'Louange' }])],
      team_members: [ok([{ team_id: 't2' }])],
    }) as never
    expect(await listAutoFillTeams(admin, 'u1', 'admin')).toEqual([
      { id: 't1', name: 'Accueil', isMember: false },
      { id: 't2', name: 'Louange', isMember: true },
    ])
  })

  it('un éditeur obtient ses équipes dirigées ; isMember reflète son appartenance', async () => {
    const admin = makeFakeSupabase({
      team_members: [ok([{ team_id: 't1' }]), ok([{ team_id: 't1' }, { team_id: 't9' }])],
      teams: [ok([{ id: 't1', name: 'Accueil' }])],
    }) as never
    expect(await listAutoFillTeams(admin, 'u1', 'editor')).toEqual([{ id: 't1', name: 'Accueil', isMember: true }])
  })

  it('un éditeur sans équipe dirigée n’obtient rien (et aucune requête sur teams)', async () => {
    const admin = makeFakeSupabase({ team_members: [ok([])] })
    expect(await listAutoFillTeams(admin as never, 'u1', 'editor')).toEqual([])
    expect(admin.calls).toEqual(['team_members'])
  })

  it('fail-closed : lecture des responsabilités en échec → aucune équipe', async () => {
    const admin = makeFakeSupabase({ team_members: [{ data: null, error: { message: 'db down' } }] }) as never
    expect(await listAutoFillTeams(admin, 'u1', 'editor')).toEqual([])
  })
})
