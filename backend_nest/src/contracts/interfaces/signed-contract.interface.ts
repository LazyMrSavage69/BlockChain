export interface SignedContract {
  id: string;
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
  created_at: string;
  updated_at: string;
}

