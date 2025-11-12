-- Table pour les contrats signés dans Supabase
-- À exécuter dans l'éditeur SQL de Supabase

CREATE TABLE IF NOT EXISTS signed_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id INTEGER NOT NULL,
  counterparty_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  clauses JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_text TEXT,
  initiator_agreed BOOLEAN NOT NULL DEFAULT false,
  counterparty_agreed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending_counterparty',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_signed_contracts_initiator ON signed_contracts(initiator_id);
CREATE INDEX IF NOT EXISTS idx_signed_contracts_counterparty ON signed_contracts(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_signed_contracts_status ON signed_contracts(status);
CREATE INDEX IF NOT EXISTS idx_signed_contracts_created_at ON signed_contracts(created_at DESC);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS update_signed_contracts_updated_at ON signed_contracts;
CREATE TRIGGER update_signed_contracts_updated_at
  BEFORE UPDATE ON signed_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour documentation
COMMENT ON TABLE signed_contracts IS 'Contrats intelligents générés par Gemini et signés par les utilisateurs';
COMMENT ON COLUMN signed_contracts.initiator_id IS 'ID de l''utilisateur créateur (référence MySQL users.id)';
COMMENT ON COLUMN signed_contracts.counterparty_id IS 'ID de l''utilisateur contrepartie (référence MySQL users.id)';
COMMENT ON COLUMN signed_contracts.clauses IS 'Tableau JSON des clauses du contrat';
COMMENT ON COLUMN signed_contracts.status IS 'Statut: draft, pending_counterparty, fully_signed';

