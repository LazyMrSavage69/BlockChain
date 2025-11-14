-- Script pour mettre à jour le schéma des contrats
-- À exécuter dans l'éditeur SQL de Supabase

-- Table pour les contrats générés par l'IA (avant signature)
-- Note: user IDs sont INTEGER car ils viennent de MySQL auth service
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  owner_id INTEGER NOT NULL, -- Référence MySQL users.id (INTEGER)
  initiator_id INTEGER NOT NULL, -- Référence MySQL users.id (INTEGER)
  counterparty_id INTEGER NOT NULL, -- Référence MySQL users.id (INTEGER)
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  clauses JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  initiator_agreed BOOLEAN NOT NULL DEFAULT false,
  counterparty_agreed BOOLEAN NOT NULL DEFAULT false,
  generated_by TEXT DEFAULT 'AI',
  blockchain_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_contracts_owner ON contracts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contracts_initiator ON contracts(initiator_id);
CREATE INDEX IF NOT EXISTS idx_contracts_counterparty ON contracts(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table pour les contrats signés (après signature des deux parties)
-- Modifier signed_contracts pour ajouter blockchain_hash et contract_id si pas déjà présents
ALTER TABLE signed_contracts ADD COLUMN IF NOT EXISTS blockchain_hash TEXT;
ALTER TABLE signed_contracts ADD COLUMN IF NOT EXISTS contract_id UUID; -- Référence vers contracts.id

-- S'assurer que initiator_id et counterparty_id sont INTEGER (comme dans le schéma actuel)
-- Si ils sont UUID, il faudra les convertir, mais pour l'instant on assume qu'ils sont INTEGER

-- Index pour blockchain_hash
CREATE INDEX IF NOT EXISTS idx_signed_contracts_blockchain_hash ON signed_contracts(blockchain_hash) WHERE blockchain_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_signed_contracts_contract_id ON signed_contracts(contract_id) WHERE contract_id IS NOT NULL;

-- Désactiver RLS sur contracts (backend utilise service role key)
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;

-- Commentaires
COMMENT ON TABLE contracts IS 'Contrats générés par l''IA, en attente de signature';
COMMENT ON COLUMN contracts.owner_id IS 'ID du propriétaire/créateur du contrat';
COMMENT ON COLUMN contracts.initiator_id IS 'ID de l''initiateur du contrat';
COMMENT ON COLUMN contracts.counterparty_id IS 'ID de la contrepartie';
COMMENT ON COLUMN contracts.content IS 'Contenu JSON du contrat (pour compatibilité)';
COMMENT ON COLUMN contracts.clauses IS 'Tableau JSON des clauses du contrat';
COMMENT ON COLUMN contracts.blockchain_hash IS 'Hash blockchain (vide jusqu''à sauvegarde sur blockchain)';
COMMENT ON COLUMN contracts.status IS 'Statut: draft, pending_counterparty, fully_signed';
COMMENT ON COLUMN signed_contracts.blockchain_hash IS 'Hash blockchain du contrat signé';
COMMENT ON COLUMN signed_contracts.contract_id IS 'Référence vers le contrat original dans contracts';

