import { Resend } from 'resend'

/** Retourne l'URL de base du site en évitant les liens localhost dans les emails */
function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL
  if (!url || url.startsWith('http://localhost')) return 'https://www.egliselarencontre.fr'
  return url
}

/** "25 mai", "3 décembre", etc. — format court pour les objets d'email */
function shortDate(serviceDate: string): string {
  return new Date(serviceDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  })
}

/** Construit l'objet email : "Culte du dimanche · 25 mai — Présidence" */
function buildSubject(planTitle: string, serviceDate: string, positionName: string | null): string {
  const date = shortDate(serviceDate)
  const position = positionName ? ` — ${positionName}` : ''
  return `${planTitle} · ${date}${position}`
}

function getResend() {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) throw new Error(`RESEND_API_KEY manquante ou vide (env: ${Object.keys(process.env).filter(k => k.includes('RESEND')).join(', ') || 'aucune clé RESEND trouvée'})`)
  return new Resend(key)
}

export async function sendInviteEmail({
  to,
  firstName,
  inviteLink,
}: {
  to: string
  firstName: string
  inviteLink: string
}) {
  const resend = getResend()
  const { error } = await resend.emails.send({
    from: 'Église La Rencontre <no-reply@egliselarencontre.fr>',
    to,
    subject: 'Tu es invité(e) — Église La Rencontre',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a2e2e;">
        <p style="margin-bottom:8px;">Bonjour ${firstName},</p>
        <p style="margin-bottom:24px;">
          Tu as été invité(e) à rejoindre l'espace bénévoles de l'<strong>Église La Rencontre</strong>.
          Clique sur le bouton ci-dessous pour créer ton mot de passe et accéder à ton espace.
        </p>
        <a href="${inviteLink}"
           style="display:inline-block;background:#3D7D85;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Créer mon mot de passe →
        </a>
        <p style="margin-top:32px;font-size:12px;color:#999;">
          Église La Rencontre · Lieusaint<br>
          Si tu n'es pas concerné(e) par ce message, ignore-le.
        </p>
      </div>
    `,
  })
  if (error) throw new Error(`Resend sendInviteEmail: ${error.message} (to: ${to})`)
}

export async function sendPasswordResetEmail({
  to,
  firstName,
  resetLink,
}: {
  to: string
  firstName: string
  resetLink: string
}) {
  const resend = getResend()
  const { error } = await resend.emails.send({
    from: 'Église La Rencontre <no-reply@egliselarencontre.fr>',
    to,
    subject: 'Réinitialisation de ton mot de passe — Église La Rencontre',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a2e2e;">
        <p style="margin-bottom:8px;">Bonjour ${firstName},</p>
        <p style="margin-bottom:24px;">
          Tu as demandé à réinitialiser ton mot de passe pour l'<strong>Église La Rencontre</strong>.
          Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe.
        </p>
        <a href="${resetLink}"
           style="display:inline-block;background:#3D7D85;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Réinitialiser mon mot de passe →
        </a>
        <p style="margin-top:32px;font-size:12px;color:#999;">
          Église La Rencontre · Lieusaint<br>
          Si tu n'es pas à l'origine de cette demande, ignore ce message.
        </p>
      </div>
    `,
  })
  if (error) throw new Error(`Resend sendPasswordResetEmail: ${error.message} (to: ${to})`)
}

export async function sendCancellationNotificationEmail({
  to,
  volunteerName,
  planTitle,
  serviceDate,
  positionName,
  teamName,
}: {
  to: string
  volunteerName: string
  planTitle: string
  serviceDate: string
  positionName: string | null
  teamName: string | null
}) {
  const date = new Date(serviceDate).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const time = new Date(serviceDate).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  })
  const siteUrl = getSiteUrl()
  const resend = getResend()

  const { error: errCancel } = await resend.emails.send({
    from: 'Église La Rencontre <no-reply@egliselarencontre.fr>',
    to,
    subject: `Désistement : ${volunteerName} — ${planTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a2e2e;">
        <p style="margin-bottom:8px;">Bonjour,</p>
        <p style="margin-bottom:16px;">
          <strong>${volunteerName}</strong> s'est désisté(e) pour le service suivant :
        </p>

        <div style="background:#fff7ed;border-radius:10px;padding:18px 20px;margin-bottom:20px;border-left:4px solid #f97316;">
          <p style="margin:0;font-size:16px;font-weight:600;">${planTitle}</p>
          <p style="margin:6px 0 0;color:#555;font-size:14px;text-transform:capitalize;">${date} à ${time}</p>
          ${teamName ? `<p style="margin:6px 0 0;color:#0d9488;font-size:14px;">Équipe : ${teamName}</p>` : ''}
          ${positionName ? `<p style="margin:6px 0 0;color:#0d9488;font-size:14px;">Poste : ${positionName}</p>` : ''}
        </div>

        <p style="margin-bottom:20px;color:#555;font-size:14px;">
          Il faudra prévoir un remplaçant pour ce poste.
        </p>

        <a href="${siteUrl}/benevoles/admin/plans"
           style="display:inline-block;background:#3D7D85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Gérer la planification →
        </a>

        <p style="margin-top:32px;font-size:12px;color:#999;">
          Église La Rencontre · Lieusaint
        </p>
      </div>
    `,
  })
  if (errCancel) throw new Error(`Resend sendCancellationEmail: ${errCancel.message} (to: ${to})`)
}

export async function sendReminderEmail({
  to,
  firstName,
  planTitle,
  serviceDate,
  positionName,
  teamName,
  assignmentId,
  daysLeft,
  isPending = false,
  isExternal = false,
}: {
  to: string
  firstName: string
  planTitle: string
  serviceDate: string
  positionName: string | null
  teamName: string | null
  assignmentId: string
  daysLeft: number
  isPending?: boolean
  isExternal?: boolean
}) {
  const date = new Date(serviceDate).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const time = new Date(serviceDate).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  })
  const siteUrl = getSiteUrl()
  const resend = getResend()

  const responseUrl = isExternal
    ? `${siteUrl}/benevoles/repondre-ext/${assignmentId}`
    : `${siteUrl}/benevoles/dashboard`

  const label = daysLeft === 1 ? 'demain' : `dans ${daysLeft} jours`

  // Pour les pending : style orange urgent + message d'action
  // Pour les confirmed : style teal informatif
  const cardStyle = isPending
    ? 'background:#fff7ed;border-left:4px solid #f97316;'
    : daysLeft <= 2
      ? 'background:#fff7ed;border-left:4px solid #f97316;'
      : 'background:#f0faf9;border-left:4px solid #0d9488;'

  const intro = isPending
    ? `Tu es planifié(e) <strong>${label}</strong> pour le service suivant, mais tu n'as pas encore confirmé ta participation.`
    : `Rappel : tu es programmé(e) <strong>${label}</strong> pour le service suivant.`

  const subjectPrefix = isPending ? `⚠ Confirmation attendue (${label})` : `Rappel (${label})`

  const ctaHtml = isPending && !isExternal ? `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
      <a href="${responseUrl}"
         style="display:inline-block;background:#3D7D85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Confirmer ma présence →
      </a>
    </div>
    <p style="font-size:13px;color:#555;margin-bottom:24px;">
      Si tu ne peux pas venir, merci de le signaler depuis ton
      <a href="${responseUrl}" style="color:#3D7D85;">espace bénévole</a> pour que le coordinateur puisse trouver un remplaçant.
    </p>
  ` : `
    <a href="${responseUrl}"
       style="display:inline-block;background:#3D7D85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:24px;">
      ${isExternal ? 'Voir les détails →' : 'Mon espace bénévole →'}
    </a>
  `

  const { error } = await resend.emails.send({
    from: 'Église La Rencontre <no-reply@egliselarencontre.fr>',
    to,
    subject: `${subjectPrefix} · ${buildSubject(planTitle, serviceDate, positionName)}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a2e2e;">
        <p style="margin-bottom:8px;">Bonjour ${firstName},</p>
        <p style="margin-bottom:16px;">${intro}</p>

        <div style="${cardStyle}border-radius:10px;padding:18px 20px;margin-bottom:20px;">
          <p style="margin:0;font-size:16px;font-weight:600;">${planTitle}</p>
          <p style="margin:6px 0 0;color:#555;font-size:14px;text-transform:capitalize;">${date} à ${time}</p>
          ${teamName ? `<p style="margin:6px 0 0;color:#0d9488;font-size:14px;">Équipe : ${teamName}</p>` : ''}
          ${positionName ? `<p style="margin:6px 0 0;color:#0d9488;font-size:14px;">Poste : ${positionName}</p>` : ''}
        </div>

        ${ctaHtml}

        <p style="margin-top:32px;font-size:12px;color:#999;">
          Église La Rencontre · Lieusaint<br>
          Si tu n'es pas concerné(e) par ce message, ignore-le.
        </p>
      </div>
    `,
  })
  if (error) throw new Error(`Resend sendReminderEmail: ${error.message} (to: ${to})`)
}

export async function sendExternalGuestInvitationEmail({
  to,
  guestName,
  planTitle,
  serviceDate,
  positionName,
  teamName,
  assignmentId,
}: {
  to: string
  guestName: string
  planTitle: string
  serviceDate: string
  positionName: string | null
  teamName: string | null
  assignmentId: string
}) {
  const date = new Date(serviceDate).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const time = new Date(serviceDate).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  })
  const siteUrl = getSiteUrl()
  const resend = getResend()

  const { error } = await resend.emails.send({
    from: 'Église La Rencontre <no-reply@egliselarencontre.fr>',
    to,
    subject: buildSubject(planTitle, serviceDate, positionName),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a2e2e;">
        <p style="margin-bottom:8px;">Bonjour ${guestName},</p>
        <p style="margin-bottom:16px;">
          L'<strong>Église La Rencontre</strong> vous invite à participer au service suivant :
        </p>

        <div style="background:#f0faf9;border-radius:10px;padding:18px 20px;margin-bottom:20px;border-left:4px solid #0d9488;">
          <p style="margin:0;font-size:16px;font-weight:600;">${planTitle}</p>
          <p style="margin:6px 0 0;color:#555;font-size:14px;text-transform:capitalize;">${date} à ${time}</p>
          ${teamName ? `<p style="margin:6px 0 0;color:#0d9488;font-size:14px;">Équipe : ${teamName}</p>` : ''}
          ${positionName ? `<p style="margin:6px 0 0;color:#0d9488;font-size:14px;">Rôle : ${positionName}</p>` : ''}
        </div>

        <p style="margin-bottom:20px;">
          Merci de nous indiquer si vous pouvez participer :
        </p>

        <a href="${siteUrl}/benevoles/repondre-ext/${assignmentId}"
           style="display:inline-block;background:#3D7D85;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Répondre à l'invitation →
        </a>

        <p style="margin-top:32px;font-size:12px;color:#999;">
          Église La Rencontre · Lieusaint<br>
          Si vous n'êtes pas concerné(e) par ce message, ignorez-le.
        </p>
      </div>
    `,
  })
  if (error) throw new Error(`Resend sendExternalGuestInvitationEmail: ${error.message} (to: ${to})`)
}

export async function sendPlanAssignmentEmail({
  to,
  firstName,
  planTitle,
  serviceDate,
  positionName,
  teamName,
  assignmentId,
}: {
  to: string
  firstName: string
  planTitle: string
  serviceDate: string
  positionName: string | null
  teamName: string | null
  assignmentId: string
}) {
  const date = new Date(serviceDate).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const time = new Date(serviceDate).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  })
  const siteUrl = getSiteUrl()
  const resend = getResend()

  const { error: errPlan } = await resend.emails.send({
    from: 'Église La Rencontre <no-reply@egliselarencontre.fr>',
    to,
    subject: buildSubject(planTitle, serviceDate, positionName),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a2e2e;">
        <p style="margin-bottom:8px;">Bonjour ${firstName},</p>
        <p style="margin-bottom:16px;">Tu as été planifié(e) pour le service suivant :</p>

        <div style="background:#f0faf9;border-radius:10px;padding:18px 20px;margin-bottom:20px;border-left:4px solid #0d9488;">
          <p style="margin:0;font-size:16px;font-weight:600;">${planTitle}</p>
          <p style="margin:6px 0 0;color:#555;font-size:14px;text-transform:capitalize;">${date} à ${time}</p>
          ${teamName ? `<p style="margin:6px 0 0;color:#0d9488;font-size:14px;">Équipe : ${teamName}</p>` : ''}
          ${positionName ? `<p style="margin:6px 0 0;color:#0d9488;font-size:14px;">Poste : ${positionName}</p>` : ''}
        </div>

        <p style="margin-bottom:20px;">
          Merci de confirmer ou décliner ta disponibilité :
        </p>

        <div style="display:flex;gap:12px;margin-bottom:24px;">
          <a href="${siteUrl}/benevoles/repondre/${assignmentId}?status=confirmed"
             style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            ✓ Je confirme
          </a>
          <a href="${siteUrl}/benevoles/repondre/${assignmentId}?status=declined"
             style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            ✕ Je décline
          </a>
        </div>

        <a href="${siteUrl}/benevoles/dashboard"
           style="display:inline-block;color:#0d9488;font-size:13px;text-decoration:underline;">
          Accéder à mon espace bénévole
        </a>

        <p style="margin-top:32px;font-size:12px;color:#999;">
          Église La Rencontre · Lieusaint<br>
          Si tu n'es pas concerné(e) par ce message, ignore-le.
        </p>
      </div>
    `,
  })
  if (errPlan) throw new Error(`Resend sendPlanAssignmentEmail: ${errPlan.message} (to: ${to})`)
}

/* ── Notification annuaire entrepreneur ───────────────────── */

const STATUS_FR: Record<string, string> = {
  active:    'En activité',
  launching: 'En cours de création',
  project:   'Projet / réflexion',
}

export async function sendEntrepreneurSubmissionNotification(entrepreneur: {
  first_name: string
  last_name: string
  company_name: string
  sector: string | null
  status: string | null
  contact_email: string | null
}) {
  const resend  = getResend()
  const siteUrl = getSiteUrl()
  const adminTo = process.env.ADMIN_EMAIL ?? 'nicolas.salafranque@egliselarencontre.fr'

  const { error } = await resend.emails.send({
    from:    'Annuaire Entrepreneurs <noreply@egliselarencontre.fr>',
    to:      adminTo,
    subject: `[Annuaire] Nouvelle fiche : ${entrepreneur.first_name} ${entrepreneur.last_name} — ${entrepreneur.company_name}`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1C2B2D;">
        <div style="background:linear-gradient(135deg,#5A9EA6,#3D7D85);padding:32px 28px;border-radius:16px 16px 0 0;">
          <p style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">Annuaire des entrepreneurs</p>
          <h1 style="color:#fff;font-size:22px;font-weight:400;margin:0;">Nouvelle fiche à valider</h1>
        </div>

        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:28px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr>
              <td style="padding:8px 0;font-size:12px;color:#6b7280;width:40%;border-bottom:1px solid #f3f4f6;">Nom</td>
              <td style="padding:8px 0;font-size:14px;font-weight:600;border-bottom:1px solid #f3f4f6;">${entrepreneur.first_name} ${entrepreneur.last_name}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Entreprise</td>
              <td style="padding:8px 0;font-size:14px;font-weight:600;color:#5A9EA6;border-bottom:1px solid #f3f4f6;">${entrepreneur.company_name}</td>
            </tr>
            ${entrepreneur.sector ? `<tr>
              <td style="padding:8px 0;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Secteur</td>
              <td style="padding:8px 0;font-size:14px;border-bottom:1px solid #f3f4f6;">${entrepreneur.sector}</td>
            </tr>` : ''}
            ${entrepreneur.status ? `<tr>
              <td style="padding:8px 0;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Statut</td>
              <td style="padding:8px 0;font-size:14px;border-bottom:1px solid #f3f4f6;">${STATUS_FR[entrepreneur.status] ?? entrepreneur.status}</td>
            </tr>` : ''}
            ${entrepreneur.contact_email ? `<tr>
              <td style="padding:8px 0;font-size:12px;color:#6b7280;">Email</td>
              <td style="padding:8px 0;font-size:14px;">${entrepreneur.contact_email}</td>
            </tr>` : ''}
          </table>

          <a href="${siteUrl}/annuaire/admin"
             style="display:inline-block;background:#5A9EA6;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:20px;">
            ✓ Valider la fiche →
          </a>

          <p style="font-size:12px;color:#9ca3af;margin:0;">
            Église La Rencontre · Annuaire entrepreneurs
          </p>
        </div>
      </div>
    `,
  })
  if (error) console.error('[sendEntrepreneurSubmissionNotification]', error)
  // On ne throw pas — une erreur d'email ne doit pas bloquer la soumission
}

export async function sendEntrepreneurApprovalEmail(entrepreneur: {
  id: string
  first_name: string
  last_name: string
  company_name: string
  contact_email: string
}) {
  const resend  = getResend()
  const siteUrl = getSiteUrl()
  const ficheUrl = `${siteUrl}/annuaire#${entrepreneur.id}`

  const { error } = await resend.emails.send({
    from:    'Église La Rencontre <noreply@egliselarencontre.fr>',
    to:      entrepreneur.contact_email,
    subject: `Ta fiche est en ligne — ${entrepreneur.company_name}`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1C2B2D;">
        <div style="background:linear-gradient(135deg,#5A9EA6,#3D7D85);padding:32px 28px;border-radius:16px 16px 0 0;">
          <p style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">Annuaire des entrepreneurs</p>
          <h1 style="color:#fff;font-size:24px;font-weight:300;margin:0;line-height:1.3;">Ta fiche est publiée ! 🎉</h1>
        </div>

        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:28px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
            Bonjour ${entrepreneur.first_name},
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">
            Ta fiche <strong style="color:#1C2B2D;">${entrepreneur.company_name}</strong> a été validée
            et est maintenant visible dans l'annuaire des entrepreneurs de l'Église La Rencontre.
          </p>

          <a href="${ficheUrl}"
             style="display:inline-block;background:#5A9EA6;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:28px;">
            Voir ma fiche →
          </a>

          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">
            Tu souhaites modifier ou supprimer ta fiche ? Réponds à cet email ou contacte-nous à
            <a href="mailto:contact@egliselarencontre.fr" style="color:#5A9EA6;">contact@egliselarencontre.fr</a>.
          </p>

          <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />

          <p style="margin:0;font-size:12px;color:#9ca3af;">
            Église La Rencontre · Lieusaint
          </p>
        </div>
      </div>
    `,
  })
  if (error) console.error('[sendEntrepreneurApprovalEmail]', error)
}
