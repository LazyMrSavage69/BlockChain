export interface SignedContract {
  id: string;
  contract_id?: string | null; // Référence vers contracts.id
  initiator_id: number;
  counterparty_id: number;
  title: string;
  summary: string;
  clauses: Array<{
    title: string;
    body: string;
  }>;
  suggestions: string[];
  raw_text?: string | null;
  initiator_agreed: boolean;
  counterparty_agreed: boolean;
  status: string;
  blockchain_hash?: string | null;
  created_at: string;
  updated_at: string;
}

