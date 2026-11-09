import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Périmètre de l'auto-remplissage pour l'utilisateur connecté.
 *  `teamIds: null` = toutes les équipes (admin) ; sinon uniquement ces équipes. */
export type AutoFillScope =
  | { ok: true; teamIds: string[] | null }
  | { ok: false; error: string }

/** Un administrateur planifie toutes les équipes ; tout autre profil autorisé (éditeur) ne planifie
 *  que celles dont il est responsable (`team_members.role = 'leader'`) — même règle que la page
 *  « Équipes ». Fail-closed : si la lecture échoue ou si aucune équipe n'est dirigée, rien n'est
 *  planifiable plutôt que de retomber sur « tout ». */
export async function resolveAutoFillScope(admin: AdminClient, userId: string, permission: string): Promise<AutoFillScope> {
  if (permission === 'admin' || permission === 'super_admin') return { ok: true, teamIds: null }

  const { data, error } = await admin
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .eq('role', 'leader')
  if (error) {
    return { ok: false, error: `Vérification de vos équipes impossible (${error.message}) : auto-remplissage refusé par précaution.` }
  }
  const teamIds = [...new Set((data ?? []).map(r => r.team_id as string))]
  if (teamIds.length === 0) {
    return { ok: false, error: "Vous n'êtes responsable d'aucune équipe : l'auto-remplissage ne planifie que les équipes dont vous êtes responsable." }
  }
  return { ok: true, teamIds }
}

/** Restreint le périmètre autorisé aux équipes choisies dans la modale. `requested` est fourni par
 *  le client (modifiable) : toute équipe hors du périmètre de l'utilisateur est REFUSÉE en bloc
 *  plutôt que silencieusement ignorée. `undefined` = pas de choix, on garde tout le périmètre ;
 *  une liste vide est une erreur (jamais de repli sur « tout »). */
export function narrowAutoFillScope(
  allowed: string[] | null,
  requested: string[] | undefined,
): { ok: true; teamIds: string[] | null } | { ok: false; error: string } {
  if (requested === undefined) return { ok: true, teamIds: allowed }
  const teamIds = [...new Set(requested)]
  if (teamIds.length === 0) return { ok: false, error: 'Sélectionnez au moins une équipe à remplir.' }
  if (allowed !== null && teamIds.some(id => !allowed.includes(id))) {
    return { ok: false, error: "Vous n'êtes pas responsable de toutes les équipes sélectionnées : auto-remplissage refusé." }
  }
  return { ok: true, teamIds }
}

/** Équipes que l'utilisateur peut proposer à l'auto-remplissage (toutes pour un admin, ses équipes
 *  pour un éditeur), triées par nom. `isMember` = il en fait partie (quel que soit son rôle) : c'est
 *  ce qui est coché par défaut dans la modale. Vide si le périmètre est refusé (fail-closed). */
export async function listAutoFillTeams(admin: AdminClient, userId: string, permission: string): Promise<{ id: string; name: string; isMember: boolean }[]> {
  const scope = await resolveAutoFillScope(admin, userId, permission)
  if (!scope.ok) return []
  let query = admin.from('teams').select('id, name').order('name')
  if (scope.teamIds !== null) query = query.in('id', scope.teamIds)
  const [{ data: teams }, { data: memberships }] = await Promise.all([
    query,
    admin.from('team_members').select('team_id').eq('user_id', userId),
  ])
  const memberOf = new Set((memberships ?? []).map(m => m.team_id as string))
  return (teams ?? []).map(t => ({ id: t.id as string, name: t.name as string, isMember: memberOf.has(t.id as string) }))
}
