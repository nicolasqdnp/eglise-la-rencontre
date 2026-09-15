import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Entrepreneur } from '../../constants'
import { EditEntrepreneurForm } from './EditEntrepreneurForm'

export const metadata = { title: 'Modifier ma fiche — Annuaire' }

export default async function ModifierFichePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data } = await admin
    .from('entrepreneurs')
    .select('*')
    .eq('edit_token', token)
    .single()

  if (!data) notFound()

  const entrepreneur = data as Entrepreneur & { edit_token: string }

  return <EditEntrepreneurForm entrepreneur={entrepreneur} token={token} />
}
