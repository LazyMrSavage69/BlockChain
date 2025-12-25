-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.avatars (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id integer NOT NULL UNIQUE,
  email text,
  name text,
  avatar_url text,
  style text,
  seed text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT avatars_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid,
  owner_id integer NOT NULL,
  initiator_id integer NOT NULL,
  counterparty_id integer,
  title text NOT NULL,
  summary text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  clauses jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_text text,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft'::text,
  initiator_agreed boolean NOT NULL DEFAULT false,
  counterparty_agreed boolean NOT NULL DEFAULT false,
  generated_by text DEFAULT 'AI'::text,
  blockchain_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  contract_amount numeric DEFAULT 0,
  initiator_payment_amount numeric DEFAULT 0,
  counterparty_payment_amount numeric DEFAULT 0,
  initiator_paid boolean DEFAULT false,
  counterparty_paid boolean DEFAULT false,
  initiator_payment_date timestamp with time zone,
  counterparty_payment_date timestamp with time zone,
  payment_status text DEFAULT 'pending'::text,
  chain_id bigint,
  registration_cost_eth numeric,
  CONSTRAINT contracts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.friend_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id integer NOT NULL,
  receiver_id integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT friend_invitations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id integer NOT NULL,
  receiver_id integer NOT NULL,
  content text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_email character varying NOT NULL,
  payment_type character varying NOT NULL CHECK (payment_type::text = ANY (ARRAY['credit_card'::character varying, 'paypal'::character varying, 'crypto'::character varying, 'bank_transfer'::character varying]::text[])),
  is_default boolean DEFAULT false,
  provider_customer_id character varying,
  last_four character varying,
  card_brand character varying,
  expiry_month integer,
  expiry_year integer,
  crypto_wallet_address character varying,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_email character varying NOT NULL,
  subscription_id uuid,
  payment_method_id uuid,
  amount numeric NOT NULL,
  currency character varying DEFAULT 'USD'::character varying,
  status character varying NOT NULL CHECK (status::text = ANY (ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying]::text[])),
  payment_provider character varying NOT NULL,
  provider_transaction_id character varying,
  failure_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payment_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT payment_transactions_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id),
  CONSTRAINT payment_transactions_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id)
);
CREATE TABLE public.signed_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  initiator_id integer NOT NULL,
  counterparty_id integer NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  clauses jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_text text,
  initiator_agreed boolean NOT NULL DEFAULT false,
  counterparty_agreed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending_counterparty'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  blockchain_hash text,
  contract_id uuid,
  contract_amount numeric DEFAULT 0,
  initiator_payment_amount numeric DEFAULT 0,
  counterparty_payment_amount numeric DEFAULT 0,
  initiator_paid boolean DEFAULT false,
  counterparty_paid boolean DEFAULT false,
  initiator_payment_date timestamp with time zone,
  counterparty_payment_date timestamp with time zone,
  payment_status text DEFAULT 'pending'::text,
  chain_id bigint,
  registration_cost_eth numeric,
  CONSTRAINT signed_contracts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_email character varying NOT NULL UNIQUE,
  plan_id character varying NOT NULL CHECK (plan_id::text = ANY (ARRAY['free'::character varying, 'standard'::character varying, 'creator'::character varying]::text[])),
  status character varying NOT NULL DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'cancelled'::character varying, 'expired'::character varying, 'pending'::character varying]::text[])),
  current_period_start timestamp with time zone NOT NULL DEFAULT now(),
  current_period_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  cancelled_at timestamp with time zone,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.usage_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_email character varying NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  contracts_created integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usage_tracking_pkey PRIMARY KEY (id)
);