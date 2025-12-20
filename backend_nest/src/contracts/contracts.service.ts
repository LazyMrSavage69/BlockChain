import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Contract } from './interfaces/contract.interface';
import { SignedContract } from './interfaces/signed-contract.interface';
import { CreateSignedContractDto } from './dto/create-signed-contract.dto';

@Injectable()
export class ContractsService {
  private readonly supabase: SupabaseClient;

  constructor() {
    // Use service role key to bypass RLS policies (backend service)
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '',
    );
  }

  async findAll(): Promise<any[]> {
    // Get all templates where visibility is true or null (default to visible)
    const { data, error } = await this.supabase
      .from('contract_templates')
      .select('*')
      .or('visibility.is.null,visibility.eq.true'); // Show templates where visibility is null or true

    if (error) {
      console.error('Error fetching templates:', error);
      throw new Error(error.message);
    }
    console.log(`[ContractsService] Found ${data?.length || 0} templates`);
    return (data || []) as any[];
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

  async getTemplateById(id: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('contract_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      return null;
    }
    return data;
  }

  async createMarketplaceTransaction(payload: {
    buyerId: string;
    templateId: string;
    price: number;
    paymentStatus: string;
    txHash: string;
  }): Promise<any> {
    // Note: buyer_id in schema is UUID (auth.users.id), but we have integer user_id
    // We'll store it as string for now, or you may need to map it
    const { data, error } = await this.supabase
      .from('marketplace_transactions')
      .insert({
        buyer_id: payload.buyerId, // This might need conversion to UUID
        template_id: payload.templateId,
        price: payload.price,
        payment_status: payload.paymentStatus,
        tx_hash: payload.txHash,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating marketplace transaction:', error);
      throw new Error(error.message);
    }
    return data;
  }

  async createContractFromTemplate(
    templateId: string,
    buyerId: number,
    sellerId: number, // creator_id from template - Unused for contract parties now
  ): Promise<Contract> {
    console.log(`[ContractsService] Creating contract from template ${templateId} for buyer ${buyerId}`);

    // Get template
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    console.log('[ContractsService] DEBUG Template Structure:', JSON.stringify(template, null, 2));

    // Extract contract data from template
    // Templates might have 'example' or 'schema' fields with clause data
    const example = template.example || {};
    const schema = template.schema || {};

    let clauses = [];
    if (example.clauses && Array.isArray(example.clauses)) {
      clauses = example.clauses;
    } else if (schema.clauses && Array.isArray(schema.clauses)) {
      clauses = schema.clauses;
    } else if (schema.properties && schema.properties.clauses) {
      // Try to extract from schema properties if structured that way
      clauses = [];
    }

    console.log(`[ContractsService] Extracted ${clauses.length} clauses from template`);

    // Create contract with buyer as initiator. Counterparty is NULL initially.
    const { data: contract, error } = await this.supabase
      .from('contracts')
      .insert({
        initiator_id: buyerId,
        counterparty_id: null,
        owner_id: buyerId,
        title: template.title || 'Contract from Template',
        summary: template.description || '',
        clauses: clauses,
        suggestions: example.suggestions || [],
        raw_text: example.raw_text || null,
        initiator_agreed: false,
        counterparty_agreed: false,
        status: 'draft',
        template_id: templateId,
        metadata: { source: 'template', original_price: (template as any).price },
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contract from template:', error);
      throw new Error(error.message);
    }

    return contract as Contract;
  }

  async updateMarketplaceTransaction(
    txHash: string,
    status: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('marketplace_transactions')
      .update({ payment_status: status })
      .eq('tx_hash', txHash);

    if (error) {
      console.error('Error updating marketplace transaction:', error);
      throw new Error(error.message);
    }
  }

  async createContract(
    payload: CreateSignedContractDto,
  ): Promise<Contract> {
    const status =
      payload.status ||
      (payload.initiatorAgreed && payload.counterpartyAgreed
        ? 'fully_signed'
        : payload.initiatorAgreed
          ? 'pending_counterparty'
          : 'draft');

    // Save in contracts table (before signing)
    const { data, error } = await this.supabase
      .from('contracts')
      .insert({
        owner_id: payload.initiatorId, // Owner is the initiator
        initiator_id: payload.initiatorId,
        counterparty_id: payload.counterpartyId,
        title: payload.title,
        summary: payload.summary,
        content: { clauses: payload.clauses }, // Store in content for compatibility
        clauses: payload.clauses,
        suggestions: payload.suggestions ?? [],
        raw_text: payload.rawText ?? null,
        initiator_agreed: payload.initiatorAgreed,
        counterparty_agreed: payload.counterpartyAgreed,
        status,
        generated_by: 'AI',
        blockchain_hash: null, // Empty until saved on blockchain
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create contract');
    }

    return data as Contract;
  }

  // Legacy method name for backward compatibility
  async createSignedContract(
    payload: CreateSignedContractDto,
  ): Promise<Contract> {
    return this.createContract(payload);
  }

  // Move contract from contracts to signed_contracts when both parties sign
  async moveToSignedContracts(contractId: string): Promise<SignedContract> {
    // Get the contract from contracts table
    const { data: contract, error: fetchError } = await this.supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (fetchError || !contract) {
      throw new Error('Contract not found');
    }

    // Check if both parties agreed
    if (!contract.initiator_agreed || !contract.counterparty_agreed) {
      throw new Error('Both parties must agree before moving to signed_contracts');
    }

    // Insert into signed_contracts
    const { data: signedContract, error: insertError } = await this.supabase
      .from('signed_contracts')
      .insert({
        contract_id: contract.id, // Reference to original contract
        initiator_id: contract.initiator_id,
        counterparty_id: contract.counterparty_id,
        title: contract.title,
        summary: contract.summary,
        clauses: contract.clauses,
        suggestions: contract.suggestions ?? [],
        raw_text: contract.raw_text,
        initiator_agreed: contract.initiator_agreed,
        counterparty_agreed: contract.counterparty_agreed,
        status: 'fully_signed',
        blockchain_hash: null, // Empty until saved on blockchain
      })
      .select()
      .single();

    if (insertError || !signedContract) {
      throw new Error(insertError?.message || 'Failed to move contract to signed_contracts');
    }

    // Optionally, delete or mark the original contract as archived
    // For now, we'll keep it for reference
    await this.supabase
      .from('contracts')
      .update({ status: 'archived' })
      .eq('id', contractId);

    return signedContract as SignedContract;
  }

  async getContractsByInitiator(userId: number): Promise<Contract[]> {
    const { data, error } = await this.supabase
      .from('contracts')
      .select('*')
      .eq('initiator_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contracts by initiator:', error);
      throw new Error(error.message);
    }
    console.log(`[ContractsService] Found ${data?.length || 0} contracts for initiator ${userId}`);
    return (data || []) as Contract[];
  }

  async getContractsByCounterparty(userId: number): Promise<Contract[]> {
    const { data, error } = await this.supabase
      .from('contracts')
      .select('*')
      .eq('counterparty_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contracts by counterparty:', error);
      throw new Error(error.message);
    }
    console.log(`[ContractsService] Found ${data?.length || 0} contracts for counterparty ${userId}`);
    return (data || []) as Contract[];
  }

  async getSignedContractsByInitiator(userId: number): Promise<SignedContract[]> {
    const { data, error } = await this.supabase
      .from('signed_contracts')
      .select('*')
      .eq('initiator_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as SignedContract[];
  }

  async getSignedContractsByCounterparty(userId: number): Promise<SignedContract[]> {
    const { data, error } = await this.supabase
      .from('signed_contracts')
      .select('*')
      .eq('counterparty_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as SignedContract[];
  }

  async getUserContracts(userId: number): Promise<{
    created: (Contract | SignedContract)[];
    received: (Contract | SignedContract)[];
  }> {
    console.log(`[ContractsService] getUserContracts called for userId: ${userId}`);

    // Get unsigned contracts from contracts table
    const [unsignedCreated, unsignedReceived] = await Promise.all([
      this.getContractsByInitiator(userId),
      this.getContractsByCounterparty(userId),
    ]);

    console.log(`[ContractsService] Unsigned contracts - created: ${unsignedCreated.length}, received: ${unsignedReceived.length}`);

    // Get signed contracts from signed_contracts table
    const [signedCreated, signedReceived] = await Promise.all([
      this.getSignedContractsByInitiator(userId),
      this.getSignedContractsByCounterparty(userId),
    ]);

    console.log(`[ContractsService] Signed contracts - created: ${signedCreated.length}, received: ${signedReceived.length}`);

    // Combine both (unsigned first, then signed)
    const result = {
      created: [...unsignedCreated, ...signedCreated],
      received: [...unsignedReceived, ...signedReceived],
    };

    console.log(`[ContractsService] Total contracts - created: ${result.created.length}, received: ${result.received.length}`);
    return result;
  }

  async getContractById(id: string): Promise<Contract | SignedContract> {
    console.log(`[ContractsService] getContractById called with id: ${id} (type: ${typeof id}, length: ${id?.length})`);

    // Trim and validate ID
    const trimmedId = id?.trim();
    if (!trimmedId) {
      throw new Error('Contract ID is required');
    }

    // First, try to get from contracts table (unsigned contracts)
    const { data: contract, error: contractError } = await this.supabase
      .from('contracts')
      .select('*')
      .eq('id', trimmedId)
      .single();

    console.log(`[ContractsService] Contracts table query result:`, {
      hasData: !!contract,
      contractId: contract?.id,
      error: contractError ? {
        code: contractError.code,
        message: contractError.message,
        details: contractError.details,
        hint: contractError.hint
      } : null
    });

    if (!contractError && contract) {
      console.log(`[ContractsService] Contract found in contracts table: ${contract.id}, title: ${contract.title}`);
      return contract as Contract;
    }

    // Log the specific error if it's not a "not found" error
    if (contractError && contractError.code !== 'PGRST116') {
      console.error(`[ContractsService] Unexpected error querying contracts table:`, contractError);
    }

    // If not found, try signed_contracts
    const { data: signedContract, error: signedError } = await this.supabase
      .from('signed_contracts')
      .select('*')
      .eq('id', trimmedId)
      .single();

    console.log(`[ContractsService] Signed_contracts table query result:`, {
      hasData: !!signedContract,
      contractId: signedContract?.id,
      error: signedError ? {
        code: signedError.code,
        message: signedError.message,
        details: signedError.details,
        hint: signedError.hint
      } : null
    });

    if (!signedError && signedContract) {
      console.log(`[ContractsService] Contract found in signed_contracts table: ${signedContract.id}, title: ${signedContract.title}`);
      return signedContract as SignedContract;
    }

    // Log the specific error if it's not a "not found" error
    if (signedError && signedError.code !== 'PGRST116') {
      console.error(`[ContractsService] Unexpected error querying signed_contracts table:`, signedError);
    }

    // Not found in either table - try to check if ID exists with a different query
    const { data: allContracts, error: listError } = await this.supabase
      .from('contracts')
      .select('id')
      .limit(5);

    console.log(`[ContractsService] Sample contract IDs in database:`, allContracts?.map(c => c.id));

    // Not found in either table
    console.log(`[ContractsService] Contract not found in either table: ${trimmedId}`);
    throw new Error(`Contract with id ${trimmedId} not found in contracts or signed_contracts tables`);
  }

  // Legacy method for backward compatibility
  async getSignedContractById(id: string): Promise<SignedContract> {
    const contract = await this.getContractById(id);
    if ('contract_id' in contract || contract.status === 'fully_signed') {
      return contract as SignedContract;
    }
    throw new Error('Contract is not signed yet');
  }

  async updateContract(
    id: string,
    updates: {
      title?: string;
      summary?: string;
      clauses?: Array<{ title: string; body: string }>;
    },
  ): Promise<Contract | SignedContract> {
    // Try to update in contracts table first
    const { data: contract, error: contractError } = await this.supabase
      .from('contracts')
      .update({
        ...(updates.title && { title: updates.title }),
        ...(updates.summary && { summary: updates.summary }),
        ...(updates.clauses && { clauses: updates.clauses, content: { clauses: updates.clauses } }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (!contractError && contract) {
      return contract as Contract;
    }

    // If not in contracts, try signed_contracts
    const { data: signedContract, error: signedError } = await this.supabase
      .from('signed_contracts')
      .update({
        ...(updates.title && { title: updates.title }),
        ...(updates.summary && { summary: updates.summary }),
        ...(updates.clauses && { clauses: updates.clauses }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (signedError || !signedContract) {
      throw new Error(signedError?.message || 'Failed to update contract');
    }

    return signedContract as SignedContract;
  }

  // Legacy method for backward compatibility
  async updateSignedContract(
    id: string,
    updates: {
      title?: string;
      summary?: string;
      clauses?: Array<{ title: string; body: string }>;
    },
  ): Promise<Contract | SignedContract> {
    return this.updateContract(id, updates);
  }

  async acceptContract(id: string, userId: number): Promise<Contract | SignedContract> {
    // Get current contract (from contracts table)
    const { data: contract, error: fetchError } = await this.supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !contract) {
      throw new Error('Contract not found in contracts table');
    }

    // Check if user is authorized
    if (contract.initiator_id !== userId && contract.counterparty_id !== userId) {
      throw new Error('User is not authorized to accept this contract');
    }

    // Check if already signed and moved to signed_contracts
    if (contract.status === 'archived') {
      throw new Error('Contract has already been signed and archived');
    }

    // Update agreement status
    const isInitiator = contract.initiator_id === userId;
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (isInitiator) {
      updates.initiator_agreed = true;
    } else {
      updates.counterparty_agreed = true;
    }

    // Check if both parties have agreed
    const initiatorAgreed = isInitiator ? true : contract.initiator_agreed;
    const counterpartyAgreed = isInitiator ? contract.counterparty_agreed : true;

    if (initiatorAgreed && counterpartyAgreed) {
      updates.status = 'fully_signed';

      // Update the contract
      const { data: updatedContract, error: updateError } = await this.supabase
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError || !updatedContract) {
        throw new Error(updateError?.message || 'Failed to update contract');
      }

      // Move to signed_contracts when both parties agree
      try {
        const signedContract = await this.moveToSignedContracts(id);
        return signedContract;
      } catch (moveError: any) {
        // If move fails, return the updated contract anyway
        console.error('Failed to move contract to signed_contracts:', moveError);
        return updatedContract as Contract;
      }
    } else {
      updates.status = 'pending_counterparty';

      const { data: updatedContract, error: updateError } = await this.supabase
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError || !updatedContract) {
        throw new Error(updateError?.message || 'Failed to accept contract');
      }

      return updatedContract as Contract;
    }
  }

  async createTemplate(payload: any): Promise<any> {
    const { data, error } = await this.supabase
      .from('contract_templates')
      .insert({
        title: payload.title,
        description: payload.description,
        price: payload.price,
        category: payload.category || 'General',
        example: payload.example || {},
        schema: payload.schema || {},
        visibility: true,
        // creator: payload.creatorId // If column exists, otherwise we skip or store in metadata
        // For now we assume the table might not have creator_id column, so we just insert basic info
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      throw new Error(error.message);
    }
    return data;
  }

  async updateContractTxHash(id: string, txHash: string): Promise<void> {
    const { error } = await this.supabase
      .from('contracts')
      .update({
        blockchain_hash: txHash,
        status: 'fully_signed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      // Try signed_contracts if not found in contracts
      const { error: signedError } = await this.supabase
        .from('signed_contracts')
        .update({
          blockchain_hash: txHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (signedError) {
        throw new Error(`Failed to update blockchain hash: ${error.message} / ${signedError.message}`);
      }
    }
  }
}
