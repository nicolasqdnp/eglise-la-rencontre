-- Migration 018 : ajout edit_token sur entrepreneurs
-- Permet aux entrepreneurs de modifier/supprimer leur fiche via un lien unique

ALTER TABLE entrepreneurs
  ADD COLUMN IF NOT EXISTS edit_token uuid DEFAULT gen_random_uuid();

-- Générer un token pour les fiches existantes qui n'en auraient pas
UPDATE entrepreneurs SET edit_token = gen_random_uuid() WHERE edit_token IS NULL;
