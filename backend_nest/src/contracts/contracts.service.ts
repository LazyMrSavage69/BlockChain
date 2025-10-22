import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Contract } from './interfaces/contract.interface';

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
}
