import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Contract } from './interfaces/contract.interface';
import { SignedContract } from './interfaces/signed-contract.interface';
import { CreateSignedContractDto } from './dto/create-signed-contract.dto';

@Injectable()
export class ContractsService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || '',
    );
  }

  async findAll(): Promise<Contract[]> {
    const { data, error } = await this.supabase
      .from('contract_templates')
      .select('*');

    if (error) throw new Error(error.message);
    return data as Contract[];
  }

  async findOne(id: string): Promise<Contract> {
    const { data, error } = await this.supabase
      .from('contract_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Contract;
  }

  async createSignedContract(
    payload: CreateSignedContractDto,
  ): Promise<SignedContract> {
    const status =
      payload.status ||
      (payload.initiatorAgreed && payload.counterpartyAgreed
        ? 'fully_signed'
        : payload.initiatorAgreed
        ? 'pending_counterparty'
        : 'draft');

    const { data, error } = await this.supabase
      .from('signed_contracts')
      .insert({
        initiator_id: payload.initiatorId,
        counterparty_id: payload.counterpartyId,
        title: payload.title,
        summary: payload.summary,
        clauses: payload.clauses,
        suggestions: payload.suggestions ?? [],
        raw_text: payload.rawText ?? null,
        initiator_agreed: payload.initiatorAgreed,
        counterparty_agreed: payload.counterpartyAgreed,
        status,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create signed contract');
    }

    return data as SignedContract;
  }

  async getContractsByInitiator(userId: number): Promise<SignedContract[]> {
    const { data, error } = await this.supabase
      .from('signed_contracts')
      .select('*')
      .eq('initiator_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as SignedContract[];
  }

  async getContractsByCounterparty(userId: number): Promise<SignedContract[]> {
    const { data, error } = await this.supabase
      .from('signed_contracts')
      .select('*')
      .eq('counterparty_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as SignedContract[];
  }

  async getUserContracts(userId: number): Promise<{
    created: SignedContract[];
    received: SignedContract[];
  }> {
    const [created, received] = await Promise.all([
      this.getContractsByInitiator(userId),
      this.getContractsByCounterparty(userId),
    ]);

    return { created, received };
  }
}
