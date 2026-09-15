-- Migration 017 : ajout colonne status sur entrepreneurs
-- (colonne absente si migration 016 appliquée avant son ajout)

ALTER TABLE entrepreneurs ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('active', 'launching', 'project'));
