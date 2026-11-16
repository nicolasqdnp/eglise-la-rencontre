import { test, expect, isDesktop, gotoPlan } from './helpers'
import { db, createPlan, must } from '../lib/db.mjs'

/**
 * Changer après coup la tonalité d'un chant déjà ajouté à un plan.
 * Droits : admin, super_admin et éditeur (ex. conducteur de louange = `editor` + leader de l'équipe Louange).
 * Un bénévole simple voit la tonalité en lecture seule.
 */
const TITLE = 'Culte tonalité'
const SONG_ID = 9001
const ARR_ID = '90000000-0000-0000-0000-000000000001'

let planSongId = ''

async function seedSongs() {
  await cleanSongs()
  must(await db.from('songs').insert({ id: SONG_ID, title: 'Chant de test' }), 'song')
  must(await db.from('arrangements').insert({
    id: ARR_ID, song_id: SONG_ID, name: 'Standard', chord_chart_key: 'G', keys_available: ['G', 'A'],
    chord_chart: 'Couplet 1\nG          D/F#      Em\nParoles de test ligne un',
  }), 'arrangement')
  const plan = await createPlan({ title: TITLE, paris: '2026-12-06T10:00' })
  const ps = must(await db.from('plan_songs').insert({
    plan_id: plan.id, song_id: SONG_ID, arrangement_id: ARR_ID, key_selected: 'G', order_index: 0,
  }).select('id').single(), 'plan_song')
  planSongId = ps.id
  return plan.id as string
}

async function cleanSongs() {
  await db.from('plan_songs').delete().eq('song_id', SONG_ID)
  await db.from('arrangements').delete().eq('song_id', SONG_ID)
  await db.from('songs').delete().eq('id', SONG_ID)
}

const storedKey = async () =>
  must(await db.from('plan_songs').select('key_selected').eq('id', planSongId).single(), 'lecture').key_selected as string

test.afterEach(cleanSongs)

test.describe('Tonalité d\'un chant du plan', () => {
  test('un conducteur de louange (éditeur, leader de Louange) change la tonalité, enregistrée et conservée au rechargement', async ({ as, refs }) => {
    void refs
    const planId = await seedSongs()
    const page = await as('editor')
    await gotoPlan(page, planId, TITLE)

    const select = page.locator('select[aria-label="Tonalité"]:visible').first()
    await expect(select).toHaveValue('G')
    await select.selectOption('A')

    await expect.poll(storedKey, { timeout: 15_000 }).toBe('A')
    await page.reload()
    await expect(page.locator('select[aria-label="Tonalité"]:visible').first()).toHaveValue('A')
  })

  test('le même éditeur peut aussi remettre la tonalité d\'origine', async ({ as, refs }) => {
    void refs
    const planId = await seedSongs()
    const page = await as('editor')
    await gotoPlan(page, planId, TITLE)
    const select = page.locator('select[aria-label="Tonalité"]:visible').first()
    await select.selectOption('A')
    await expect.poll(storedKey).toBe('A')
    await select.selectOption('G')
    await expect.poll(storedKey).toBe('G')
  })

  test('éditeur sur ordinateur : changer la tonalité depuis la grille d\'accords l\'enregistre aussi', async ({ as, refs }, testInfo) => {
    test.skip(!isDesktop(testInfo), 'La grille côté plan est une vue bureau')
    void refs
    const planId = await seedSongs()
    const page = await as('editor')
    await gotoPlan(page, planId, TITLE)
    await page.locator('p:visible', { hasText: 'Chant de test' }).first().click()
    await page.getByRole('button', { name: 'D', exact: true }).click()
    await expect.poll(storedKey, { timeout: 15_000 }).toBe('D')
    // La liste reflète la tonalité choisie dans la grille.
    await expect(page.locator('select[aria-label="Tonalité"]:visible').first()).toHaveValue('D')
  })

  test('un bénévole simple voit la liste des chants sans menu (lecture seule), sur tous les appareils, base inchangée', async ({ as, refs }, testInfo) => {
    void refs
    const planId = await seedSongs()
    const page = await as('paul')
    await gotoPlan(page, planId, TITLE)
    // Mobile et grand écran : la liste des chants s'affiche en lecture seule, tonalité en texte.
    await expect(page.getByText('Chant de test').filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByText('Tonalité : G').filter({ visible: true }).first()).toBeVisible()
    if (isDesktop(testInfo)) await expect(page.getByTestId('viewer-songs').getByRole('link', { name: /Setlist/ })).toBeVisible()
    await expect(page.locator('select[aria-label="Tonalité"]')).toHaveCount(0)
    expect(await storedKey()).toBe('G')
  })

  // Vue Setlist (« Live ») : ouverte à tous les bénévoles connectés, sur tous les appareils.
  async function changeKeyInSetlist(page: import('@playwright/test').Page, planId: string) {
    await page.goto(`/benevoles/admin/plans/${planId}/setlist`)
    const d = page.getByRole('button', { name: 'D', exact: true }).filter({ visible: true })
    if (!(await d.count())) await page.getByText('Chant de test').filter({ visible: true }).first().click() // mobile : ouvre la grille
    await expect(d.first()).toBeVisible()
    await d.first().click()
  }

  test('Setlist : l\'éditeur enregistre la tonalité dans le plan', async ({ as, refs }) => {
    void refs
    const planId = await seedSongs()
    const page = await as('editor')
    await changeKeyInSetlist(page, planId)
    await expect.poll(storedKey, { timeout: 15_000 }).toBe('D')
  })

  test('Setlist : un bénévole simple transpose pour lui, sans être renvoyé au tableau de bord ni modifier le plan', async ({ as, refs }) => {
    void refs
    const planId = await seedSongs()
    const page = await as('paul')
    await changeKeyInSetlist(page, planId)
    await page.waitForTimeout(2500)
    expect(page.url()).toContain('/setlist')
    expect(await storedKey()).toBe('G')
    await expect(page.getByRole('button', { name: 'D', exact: true }).filter({ visible: true }).first()).toBeVisible()
  })
})
