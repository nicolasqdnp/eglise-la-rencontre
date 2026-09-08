-- Migration 015 : postes exclus par plan
-- Permet de masquer certains postes pour un plan donné sans les supprimer de l'équipe.
-- NULL = tous les postes affichés (comportement actuel)

ALTER TABLE plans ADD COLUMN IF NOT EXISTS excluded_position_ids uuid[] DEFAULT NULL;
