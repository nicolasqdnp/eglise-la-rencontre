-- Migration 016 : annuaire des entrepreneurs de l'église
-- Page non indexée, accessible uniquement par lien direct.
-- Les soumissions sont masquées jusqu'à validation admin (visible = false).

CREATE TABLE IF NOT EXISTS entrepreneurs (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),

  -- Identité
  first_name       text        NOT NULL,
  last_name        text        NOT NULL,
  photo_url        text,
  contact_email    text,
  contact_phone    text,

  -- Entreprise
  company_name     text        NOT NULL,
  description      text,
  sector           text,
  target           text        CHECK (target IN ('b2b', 'b2c', 'both')),
  geo              text        CHECK (geo IN ('local', 'national', 'international')),
  languages        text[]      DEFAULT '{}',

  -- Liens sociaux/web — tableau JSON [{ type: 'website'|'instagram'|..., url: '...' }]
  links            jsonb       DEFAULT '[]',

  -- Modération
  visible          boolean     DEFAULT false
);

ALTER TABLE entrepreneurs ENABLE ROW LEVEL SECURITY;

-- Lecture publique des fiches validées
CREATE POLICY "entrepreneurs_public_select"
  ON entrepreneurs FOR SELECT
  USING (visible = true);

-- Le service role (admin client) bypasse RLS → pas de policy nécessaire pour INSERT/UPDATE/DELETE.

-- Bucket Supabase Storage à créer manuellement dans le dashboard :
--   Nom : entrepreneurs
--   Public : oui (pour accès aux photos sans authentification)
