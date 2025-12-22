-- Migration pour le système de paiement automatique basé sur le nombre de mots
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter les champs de paiement blockchain à la table contracts
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS payment_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS calculated_price DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS auto_payment_date TIMESTAMPTZ;

-- Ajouter les mêmes champs à signed_contracts
ALTER TABLE signed_contracts 
ADD COLUMN IF NOT EXISTS payment_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS calculated_price DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS auto_payment_date TIMESTAMPTZ;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_contracts_payment_tx_hash ON contracts(payment_tx_hash);
CREATE INDEX IF NOT EXISTS idx_signed_contracts_payment_tx_hash ON signed_contracts(payment_tx_hash);

-- Commentaires
COMMENT ON COLUMN contracts.payment_tx_hash IS 'Hash de la transaction de paiement sur la blockchain';
COMMENT ON COLUMN contracts.calculated_price IS 'Prix calculé automatiquement basé sur le nombre de mots';
COMMENT ON COLUMN contracts.auto_payment_date IS 'Date du paiement automatique';
