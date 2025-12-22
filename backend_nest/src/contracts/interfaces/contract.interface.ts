export interface Contract {
  id: string;
  template_id?: string | null;
  owner_id: number;
  initiator_id: number;
  counterparty_id: number;
  title: string;
  summary: string;
  content?: any; // JSONB
  clauses: Array<{
    title: string;
    body: string;
  }>;
  suggestions: string[];
  raw_text?: string | null;
  metadata?: any; // JSONB
  status: string;
  initiator_agreed: boolean;
  counterparty_agreed: boolean;
  generated_by?: string;
  blockchain_hash?: string | null;
  contract_amount?: number;
  initiator_payment_amount?: number;
  counterparty_payment_amount?: number;
  initiator_paid?: boolean;
  counterparty_paid?: boolean;
  initiator_payment_date?: string | null;
  counterparty_payment_date?: string | null;
  payment_status?: string;
  created_at: string;
  updated_at: string;
}
