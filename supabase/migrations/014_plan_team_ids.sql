-- Migration 014 : support multi-équipes par plan
-- Ajoute un tableau d'UUIDs d'équipes sur chaque plan.
-- NULL = comportement actuel (toutes les équipes visibles)
-- Non-NULL = seules les équipes listées apparaissent dans le plan

ALTER TABLE plans ADD COLUMN IF NOT EXISTS team_ids uuid[] DEFAULT NULL;
