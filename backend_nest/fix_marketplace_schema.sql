-- Fix for marketplace_transactions schema
-- The error "invalid input syntax for type uuid: '1'" happens because buyer_id is a UUID column,
-- but our users have Integer IDs (from MySQL authentication).
-- This script changes the column type to TEXT to allow storing Integer IDs as strings.

-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

BEGIN;

-- 1. Drop any foreign key constraint that might force it to be a UUID (e.g. referencing auth.users)
ALTER TABLE marketplace_transactions 
  DROP CONSTRAINT IF EXISTS marketplace_transactions_buyer_id_fkey;

-- 2. Change the column type from UUID to TEXT
ALTER TABLE marketplace_transactions 
  ALTER COLUMN buyer_id TYPE TEXT USING buyer_id::text;

-- 3. Add a comment explaining why
COMMENT ON COLUMN marketplace_transactions.buyer_id IS 'User ID from MySQL Auth Service (stored as TEXT)';

COMMIT;
