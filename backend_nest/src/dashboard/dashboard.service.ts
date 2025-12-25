import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
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

    async getUserStats(userIdInput: number | string) {
        const userId = Number(userIdInput);
        console.log(`[DashboardService] Getting stats for user ID: ${userId} (Type: ${typeof userIdInput})`);

        if (!Number.isFinite(userId)) {
            throw new BadRequestException('Invalid user id');
        }

        if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
            throw new InternalServerErrorException('Supabase credentials are missing');
        }

        // 1. Contracts counters
        const { count: contractsCount, error: contractsCountError } = await this.supabase
            .from('contracts')
            .select('id', { count: 'exact', head: true })
            .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`);

        if (contractsCountError) {
            console.error('[DashboardService] Error fetching contracts count:', contractsCountError);
            throw new InternalServerErrorException('Unable to fetch contracts count');
        }

        const { count: signedContractsCount, error: signedCountError } = await this.supabase
            .from('signed_contracts')
            .select('id', { count: 'exact', head: true })
            .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`);

        if (signedCountError) {
            console.error('[DashboardService] Error fetching signed contracts count:', signedCountError);
            throw new InternalServerErrorException('Unable to fetch signed contracts count');
        }

        const totalContracts = (contractsCount || 0) + (signedContractsCount || 0);

        // 2. Payments & crypto spent (only using contracts tables present in schema)
        let totalPaid = 0;
        let cryptoSpent = 0; // track ETH spent for registrations
        let paymentsPending = 0;
        let paymentsCompleted = 0;

        const processContractPayment = (c: any) => {
            const registrationCost = Number(c.registration_cost_eth ?? 0);
            if (registrationCost > 0 && c.initiator_id === userId) {
                totalPaid += registrationCost;
                cryptoSpent += registrationCost;
            }

            if (c.initiator_id === userId && c.initiator_paid) {
                totalPaid += Number(c.initiator_payment_amount || 0);
            }

            if (c.counterparty_id === userId && c.counterparty_paid) {
                totalPaid += Number(c.counterparty_payment_amount || 0);
            }

            if (c.payment_status === 'completed') {
                paymentsCompleted += 1;
            } else if (c.payment_status === 'pending' || c.payment_status === 'partial') {
                paymentsPending += 1;
            }
        };

        const { data: contractsPayData, error: contractsPayError } = await this.supabase
            .from('contracts')
            .select('initiator_id, counterparty_id, initiator_paid, counterparty_paid, initiator_payment_amount, counterparty_payment_amount, payment_status, registration_cost_eth')
            .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`);

        if (contractsPayError) {
            console.error('[DashboardService] Error fetching contracts payments:', contractsPayError);
            throw new InternalServerErrorException('Unable to fetch contracts payments');
        }

        contractsPayData?.forEach(processContractPayment);

        const { data: signedPayData, error: signedPayError } = await this.supabase
            .from('signed_contracts')
            .select('initiator_id, counterparty_id, initiator_paid, counterparty_paid, initiator_payment_amount, counterparty_payment_amount, payment_status, registration_cost_eth')
            .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`);

        if (signedPayError) {
            console.error('[DashboardService] Error fetching signed contracts payments:', signedPayError);
            throw new InternalServerErrorException('Unable to fetch signed contracts payments');
        }

        signedPayData?.forEach(processContractPayment);

        // 3. Interactions (unique people)
        const interactions = new Set<number>();

        const { data: contractsPeers, error: contractsPeersErr } = await this.supabase
            .from('contracts')
            .select('initiator_id, counterparty_id')
            .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`);

        if (contractsPeersErr) {
            console.error('[DashboardService] Error fetching contracts peers:', contractsPeersErr);
            throw new InternalServerErrorException('Unable to fetch contracts peers');
        }

        contractsPeers?.forEach(c => {
            if (c.initiator_id !== userId) interactions.add(c.initiator_id);
            if (c.counterparty_id !== userId) interactions.add(c.counterparty_id);
        });

        const { data: signedPeers, error: signedPeersErr } = await this.supabase
            .from('signed_contracts')
            .select('initiator_id, counterparty_id')
            .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`);

        if (signedPeersErr) {
            console.error('[DashboardService] Error fetching signed contracts peers:', signedPeersErr);
            throw new InternalServerErrorException('Unable to fetch signed contracts peers');
        }

        signedPeers?.forEach(c => {
            if (c.initiator_id !== userId) interactions.add(c.initiator_id);
            if (c.counterparty_id !== userId) interactions.add(c.counterparty_id);
        });

        // 4. Recent activity (last 10 items from both tables)
        const [contractsActivity, signedActivity] = await Promise.all([
            this.supabase
                .from('contracts')
                .select('id, title, status, created_at, updated_at, initiator_id, counterparty_id')
                .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`)
                .order('created_at', { ascending: false })
                .limit(10),
            this.supabase
                .from('signed_contracts')
                .select('id, title, status, created_at, updated_at, initiator_id, counterparty_id')
                .or(`initiator_id.eq.${userId},counterparty_id.eq.${userId}`)
                .order('created_at', { ascending: false })
                .limit(10),
        ]);

        if (contractsActivity.error) {
            console.error('[DashboardService] Error fetching contracts activity:', contractsActivity.error);
            throw new InternalServerErrorException('Unable to fetch contracts activity');
        }

        if (signedActivity.error) {
            console.error('[DashboardService] Error fetching signed contracts activity:', signedActivity.error);
            throw new InternalServerErrorException('Unable to fetch signed contracts activity');
        }

        const recentActivity = [
            ...(contractsActivity.data || []).map(item => ({ ...item, source: 'contract' })),
            ...(signedActivity.data || []).map(item => ({ ...item, source: 'signed_contract' })),
        ]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10);

        return {
            totalContracts,
            cryptoSpent,
            totalPaid,
            paymentsCompleted,
            paymentsPending,
            interactionCount: interactions.size,
            recentActivity,
        };
    }
}
