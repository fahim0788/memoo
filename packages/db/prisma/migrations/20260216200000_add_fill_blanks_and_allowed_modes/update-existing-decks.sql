-- ============================================================================
-- Requetes de mise a jour des decks existants avec allowedModes
-- A executer MANUELLEMENT apres la migration (pas auto-run par Prisma)
-- ============================================================================

-- NOTE: allowedModes = NULL signifie "tous les modes autorises" (backward-compatible)
-- On ne set que les decks qui doivent etre restreints ou explicitement ouverts

-- ─── Decks de langues : tous les modes (incluant fillblank et scramble) ───

UPDATE "Deck"
SET "allowedModes" = '["text","mcq","yesno","number","scramble","fillblank"]'::jsonb
WHERE "name" ILIKE '%english%'
   OR "name" ILIKE '%anglais%'
   OR "name" ILIKE '%spanish%'
   OR "name" ILIKE '%espagnol%'
   OR "name" ILIKE '%french%'
   OR "name" ILIKE '%francais%'
   OR "name" ILIKE '%français%'
   OR "name" ILIKE '%vocab%'
   OR "name" ILIKE '%langue%'
   OR "name" ILIKE '%language%'
   OR "name" ILIKE '%conversation%'
   OR "name" ILIKE '%phrases%'
   OR "name" ILIKE '%expression%';

-- ─── Decks examen civique / droit / histoire / geo : pas de scramble/fillblank ───

UPDATE "Deck"
SET "allowedModes" = '["text","mcq","yesno","number"]'::jsonb
WHERE "name" ILIKE '%civique%'
   OR "name" ILIKE '%civic%'
   OR "name" ILIKE '%citoyen%'
   OR "name" ILIKE '%droit%'
   OR "name" ILIKE '%constitution%'
   OR "name" ILIKE '%histoire%'
   OR "name" ILIKE '%history%'
   OR "name" ILIKE '%geograph%'
   OR "name" ILIKE '%géograph%'
   OR "name" ILIKE '%capitales%'
   OR "name" ILIKE '%capitals%'
   OR "name" ILIKE '%drapeau%'
   OR "name" ILIKE '%flag%'
   OR "name" ILIKE '%science%'
   OR "name" ILIKE '%chimie%'
   OR "name" ILIKE '%physique%';

-- ─── Verification : lister les decks et leurs modes ───

SELECT id, name, "allowedModes" FROM "Deck" ORDER BY name;
