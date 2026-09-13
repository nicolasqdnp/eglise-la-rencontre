import type { Metadata } from 'next'
import { EntrepreneurForm } from './EntrepreneurForm'

export const metadata: Metadata = {
  title: 'Rejoindre l\'annuaire des entrepreneurs — Église La Rencontre',
  robots: { index: false, follow: false },
}

export default function RejoindreAnnuairePage() {
  return <EntrepreneurForm />
}
