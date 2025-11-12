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

-- Table pour les invitations d'amis
CREATE TABLE IF NOT EXISTS friend_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_friend_invitations_sender ON friend_invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_invitations_receiver ON friend_invitations(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_invitations_status ON friend_invitations(status);

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS update_friend_invitations_updated_at ON friend_invitations;
CREATE TRIGGER update_friend_invitations_updated_at
  BEFORE UPDATE ON friend_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour documentation
COMMENT ON TABLE friend_invitations IS 'Invitations d''amis entre utilisateurs';
COMMENT ON COLUMN friend_invitations.sender_id IS 'ID de l''utilisateur qui envoie l''invitation (référence MySQL users.id)';
COMMENT ON COLUMN friend_invitations.receiver_id IS 'ID de l''utilisateur qui reçoit l''invitation (référence MySQL users.id)';
COMMENT ON COLUMN friend_invitations.status IS 'Statut: pending, accepted, rejected';

-- Table pour les messages entre amis
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);

-- Commentaires pour documentation
COMMENT ON TABLE messages IS 'Messages entre utilisateurs amis';
COMMENT ON COLUMN messages.sender_id IS 'ID de l''utilisateur expéditeur (référence MySQL users.id)';
COMMENT ON COLUMN messages.receiver_id IS 'ID de l''utilisateur destinataire (référence MySQL users.id)';
COMMENT ON COLUMN messages.read_at IS 'Timestamp de lecture du message (NULL si non lu)';

-- Enable Row Level Security
ALTER TABLE friend_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_invitations
-- Allow users to insert invitations they send
CREATE POLICY "Users can insert invitations they send"
  ON friend_invitations
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view invitations where they are sender or receiver
CREATE POLICY "Users can view their invitations"
  ON friend_invitations
  FOR SELECT
  USING (true);

-- Allow users to update invitations where they are the receiver
CREATE POLICY "Users can update invitations sent to them"
  ON friend_invitations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for messages
-- Allow users to insert messages they send
CREATE POLICY "Users can insert messages they send"
  ON messages
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view messages where they are sender or receiver
CREATE POLICY "Users can view their messages"
  ON messages
  FOR SELECT
  USING (true);

-- Allow users to update messages where they are the receiver (for read_at)
CREATE POLICY "Users can update messages sent to them"
  ON messages
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Enable Realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

