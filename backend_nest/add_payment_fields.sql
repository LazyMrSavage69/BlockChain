-- Script pour ajouter les champs de paiement aux contrats
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter les champs de paiement à la table contracts
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS contract_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS initiator_payment_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS counterparty_payment_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS initiator_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS counterparty_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS initiator_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS counterparty_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Ajouter les mêmes champs à signed_contracts
ALTER TABLE signed_contracts 
ADD COLUMN IF NOT EXISTS contract_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS initiator_payment_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS counterparty_payment_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS initiator_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS counterparty_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS initiator_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS counterparty_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Index pour améliorer les performances des requêtes de paiement
CREATE INDEX IF NOT EXISTS idx_contracts_payment_status ON contracts(payment_status);
CREATE INDEX IF NOT EXISTS idx_signed_contracts_payment_status ON signed_contracts(payment_status);

-- Commentaires
COMMENT ON COLUMN contracts.contract_amount IS 'Montant total du contrat';
COMMENT ON COLUMN contracts.initiator_payment_amount IS 'Montant que l''initiateur doit payer';
COMMENT ON COLUMN contracts.counterparty_payment_amount IS 'Montant que la contrepartie doit payer';
COMMENT ON COLUMN contracts.initiator_paid IS 'Si l''initiateur a payé sa part';
COMMENT ON COLUMN contracts.counterparty_paid IS 'Si la contrepartie a payé sa part';
COMMENT ON COLUMN contracts.payment_status IS 'Statut: pending, partial, completed';
