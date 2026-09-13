'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { EntrepreneurLink } from './constants'

/* ── Soumission publique ─────────────────────────────────── */

export async function submitEntrepreneur(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()

  // Champs obligatoires
  const firstName   = (formData.get('first_name')   as string)?.trim()
  const lastName    = (formData.get('last_name')    as string)?.trim()
  const companyName = (formData.get('company_name') as string)?.trim()
  if (!firstName || !lastName || !companyName) {
    return { success: false, error: 'Merci de remplir tous les champs obligatoires.' }
  }

  // Photo upload vers Supabase Storage
  const photo = formData.get('photo') as File | null
  let photoUrl: string | null = null

  if (photo && photo.size > 0) {
    // Crée le bucket s'il n'existe pas encore (idempotent)
    await admin.storage.createBucket('entrepreneurs', { public: true }).catch(() => {})

    const ext      = photo.name.split('.').pop()?.toLowerCase().replace(/[^a-z]/g, '') || 'jpg'
    const filename = `${crypto.randomUUID()}.${ext}`
    const buffer   = Buffer.from(await photo.arrayBuffer())

    const { error: uploadError } = await admin.storage
      .from('entrepreneurs')
      .upload(filename, buffer, { contentType: photo.type, upsert: false })

    if (!uploadError) {
      photoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/entrepreneurs/${filename}`
    }
  }

  // Liens sociaux (envoyés en JSON par le client)
  let links: EntrepreneurLink[] = []
  try {
    const raw = formData.get('links') as string
    if (raw) links = JSON.parse(raw)
  } catch { /* ignore */ }
  // Filtrer les urls vides
  links = links.filter(l => l.url?.trim())

  // Langues (checkbox multiple → getAll)
  const languages = (formData.getAll('languages') as string[]).filter(Boolean)

  const { error } = await admin.from('entrepreneurs').insert({
    first_name:    firstName,
    last_name:     lastName,
    contact_email: (formData.get('contact_email') as string)?.trim() || null,
    contact_phone: (formData.get('contact_phone') as string)?.trim() || null,
    photo_url:     photoUrl,
    company_name:  companyName,
    description:   (formData.get('description')   as string)?.trim() || null,
    sector:        (formData.get('sector')        as string)         || null,
    target:        (formData.get('target')        as string)         || null,
    geo:           (formData.get('geo')           as string)         || null,
    languages,
    links,
    visible: false,
  })

  if (error) {
    console.error('submitEntrepreneur:', error)
    return { success: false, error: 'Une erreur est survenue, veuillez réessayer.' }
  }

  return { success: true }
}

/* ── Actions admin ───────────────────────────────────────── */

async function requireAdminPermission() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('permission')
    .eq('id', user.id)
    .single()
  if (!['admin', 'super_admin'].includes(profile?.permission ?? '')) return null
  return createAdminClient()
}

export async function approveEntrepreneur(formData: FormData) {
  const admin = await requireAdminPermission()
  if (!admin) return
  const id = formData.get('id') as string
  await admin.from('entrepreneurs').update({ visible: true }).eq('id', id)
  revalidatePath('/annuaire')
  revalidatePath('/annuaire/admin')
}

export async function hideEntrepreneur(formData: FormData) {
  const admin = await requireAdminPermission()
  if (!admin) return
  const id = formData.get('id') as string
  await admin.from('entrepreneurs').update({ visible: false }).eq('id', id)
  revalidatePath('/annuaire')
  revalidatePath('/annuaire/admin')
}

export async function deleteEntrepreneur(formData: FormData) {
  const admin = await requireAdminPermission()
  if (!admin) return
  const id = formData.get('id') as string
  await admin.from('entrepreneurs').delete().eq('id', id)
  revalidatePath('/annuaire')
  revalidatePath('/annuaire/admin')
}
