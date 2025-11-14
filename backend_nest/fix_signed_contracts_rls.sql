-- Script à exécuter dans l'éditeur SQL de Supabase
-- Corrige le problème RLS sur la table signed_contracts

-- Option 1: Désactiver RLS (recommandé si le backend utilise SERVICE_ROLE_KEY)
ALTER TABLE signed_contracts DISABLE ROW LEVEL SECURITY;

-- Option 2: Si vous préférez garder RLS activé, créez une politique permissive
-- ALTER TABLE signed_contracts ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow all operations on signed_contracts" ON signed_contracts;
-- CREATE POLICY "Allow all operations on signed_contracts" 
--   ON signed_contracts 
--   FOR ALL 
--   USING (true) 
--   WITH CHECK (true);

