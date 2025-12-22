import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DashboardService {
    private readonly supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_ANON_KEY ||
            '',
        );
    }

    async getUserStats(userId: number) {
        // 1. Get Contracts Count (Created & Signed)
        // We check both 'contracts' (unsigned/draft) and 'signed_contracts'
        // where user is either initiator or counterparty.

        // Contracts (Unsigned)
        const { count: contractsCount, error: err1 } = await this.supabase
            .from('contracts')
            .select('id', { count: 'exact', head: true })
            .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`);

        // Signed Contracts
        const { count: signedContractsCount, error: err2 } = await this.supabase
            .from('signed_contracts')
            .select('id', { count: 'exact', head: true })
            .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`);

        const totalContracts = (contractsCount || 0) + (signedContractsCount || 0);

        // 2. Crypto Spent
        // Sum price from marketplace_transactions where buyer_id = userId
        // Note: buyer_id matches the auth service user ID (integer)
        const { data: transactions, error: err3 } = await this.supabase
            .from('marketplace_transactions')
            .select('price')
            .eq('buyer_id', userId.toString()); // Assuming buyer_id is stored as string in this table based on previous file review

        const cryptoSpent = transactions?.reduce((sum, tx) => sum + (tx.price || 0), 0) || 0;

        // 3. Payment Stats
        // Calculate total paid by user via contracts
        let totalPaid = 0;
        let paymentsPending = 0;
        let paymentsCompleted = 0;

        // Get payment data from contracts
        const { data: contractsPayData } = await this.supabase
            .from('contracts')
            .select('initiator_id, counterparty_id, initiator_paid, counterparty_paid, initiator_payment_amount, counterparty_payment_amount, payment_status')
            .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`);

        contractsPayData?.forEach(c => {
            if (c.initiator_id === userId && c.initiator_paid) {
                totalPaid += c.initiator_payment_amount || 0;
            }
            if (c.counterparty_id === userId && c.counterparty_paid) {
                totalPaid += c.counterparty_payment_amount || 0;
            }
            if (c.payment_status === 'completed') {
                paymentsCompleted++;
            } else if (c.payment_status === 'partial' || c.payment_status === 'pending') {
                paymentsPending++;
            }
        });

        // Get payment data from signed_contracts
        const { data: signedPayData } = await this.supabase
            .from('signed_contracts')
            .select('initiator_id, counterparty_id, initiator_paid, counterparty_paid, initiator_payment_amount, counterparty_payment_amount, payment_status')
            .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`);

        signedPayData?.forEach(c => {
            if (c.initiator_id === userId && c.initiator_paid) {
                totalPaid += c.initiator_payment_amount || 0;
            }
            if (c.counterparty_id === userId && c.counterparty_paid) {
                totalPaid += c.counterparty_payment_amount || 0;
            }
            if (c.payment_status === 'completed') {
                paymentsCompleted++;
            } else if (c.payment_status === 'partial' || c.payment_status === 'pending') {
                paymentsPending++;
            }
        });

        // 4. Interactions (Unique People)
        // We need to fetch all contracts and find distinct counterparties

        const interactions = new Set<number>();

        // Fetch partners from contracts
        const { data: cData } = await this.supabase
            .from('contracts')
            .select('initiator_id, counterparty_id')
            .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`);

        cData?.forEach(c => {
            if (c.initiator_id !== userId) interactions.add(c.initiator_id);
            if (c.counterparty_id !== userId) interactions.add(c.counterparty_id);
        });

        // Fetch partners from signed_contracts
        const { data: sData } = await this.supabase
            .from('signed_contracts')
            .select('initiator_id, counterparty_id')
            .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`);

        sData?.forEach(c => {
            if (c.initiator_id !== userId) interactions.add(c.initiator_id);
            if (c.counterparty_id !== userId) interactions.add(c.counterparty_id);
        });

        return {
            totalContracts,
            cryptoSpent,
            totalPaid,
            paymentsCompleted,
            paymentsPending,
            interactionCount: interactions.size,
            recentActivity: [] // Could be populated if needed
        };
    }
}
