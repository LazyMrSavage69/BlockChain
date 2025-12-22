-- Migration: add chain id and registration cost fields for blockchain registration tracking
-- Run in Supabase SQL editor

ALTER TABLE contracts 
  ADD COLUMN IF NOT EXISTS chain_id BIGINT,
  ADD COLUMN IF NOT EXISTS registration_cost_eth DECIMAL(20, 10);

ALTER TABLE signed_contracts 
  ADD COLUMN IF NOT EXISTS chain_id BIGINT,
  ADD COLUMN IF NOT EXISTS registration_cost_eth DECIMAL(20, 10);

COMMENT ON COLUMN contracts.chain_id IS 'Chain ID where the registration/signing happened';
COMMENT ON COLUMN contracts.registration_cost_eth IS 'Estimated or actual cost (in ETH) for registration/signing tx';
COMMENT ON COLUMN signed_contracts.chain_id IS 'Chain ID where the registration/signing happened';
COMMENT ON COLUMN signed_contracts.registration_cost_eth IS 'Estimated or actual cost (in ETH) for registration/signing tx';
