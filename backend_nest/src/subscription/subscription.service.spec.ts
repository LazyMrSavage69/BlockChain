import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { PlanId } from './dto/subscription.dto';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  delete: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  order: jest.fn(() => mockSupabaseClient),
  gte: jest.fn(() => mockSupabaseClient),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionService],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);

    // Reset mock calls
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlanLimits', () => {
    it('should return correct limits for FREE plan', () => {
      const limits = service.getPlanLimits(PlanId.FREE);
      
      expect(limits.contractsPerDay).toBe(1);
      expect(limits.features).toContain('Access to 1 free contract template');
    });

    it('should return correct limits for STANDARD plan', () => {
      const limits = service.getPlanLimits(PlanId.STANDARD);
      
      expect(limits.contractsPerDay).toBe(10);
      expect(limits.features).toContain('Up to 10 contracts per day');
    });

    it('should return unlimited for CREATOR plan', () => {
      const limits = service.getPlanLimits(PlanId.CREATOR);
      
      expect(limits.contractsPerDay).toBe('unlimited');
      expect(limits.features).toContain('Unlimited contract usage');
    });
  });

  describe('createSubscription', () => {
    it('should create a FREE subscription successfully', async () => {
      const mockSubscription = {
        id: '123',
        user_email: 'test@example.com',
        plan_id: PlanId.FREE,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date().toISOString(),
      };

      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockSubscription, error: null });

      const result = await service.createSubscription({
        userEmail: 'test@example.com',
        planId: PlanId.FREE,
      });

      expect(result.plan_id).toBe(PlanId.FREE);
      expect(result.status).toBe('active');
    });

    it('should throw error if user already has subscription', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'existing', user_email: 'test@example.com' },
        error: null,
      });

      await expect(
        service.createSubscription({
          userEmail: 'test@example.com',
          planId: PlanId.STANDARD,
        }),
      ).rejects.toThrow();
    });
  });

  describe('getSubscriptionByEmail', () => {
    it('should return existing subscription', async () => {
      const mockSubscription = {
        id: '123',
        user_email: 'test@example.com',
        plan_id: PlanId.STANDARD,
        status: 'active',
      };

      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockSubscription, error: null });

      const result = await service.getSubscriptionByEmail('test@example.com');

      expect(result.plan_id).toBe(PlanId.STANDARD);
    });

    it('should auto-create FREE subscription if none exists', async () => {
      const mockNewSubscription = {
        id: '456',
        user_email: 'newuser@example.com',
        plan_id: PlanId.FREE,
        status: 'active',
      };

      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockNewSubscription, error: null });

      const result = await service.getSubscriptionByEmail('newuser@example.com');

      expect(result.plan_id).toBe(PlanId.FREE);
    });
  });

  describe('checkUsageLimit', () => {
    it('should return unlimited usage for CREATOR plan', async () => {
      const mockSubscription = {
        id: '123',
        user_email: 'creator@example.com',
        plan_id: PlanId.CREATOR,
        status: 'active',
      };

      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockSubscription, error: null });

      const result = await service.checkUsageLimit('creator@example.com');

      expect(result.canCreate).toBe(true);
      expect(result.limit).toBe('unlimited');
      expect(result.planId).toBe(PlanId.CREATOR);
    });

    it('should return usage limits for FREE plan', async () => {
      const mockSubscription = {
        id: '123',
        user_email: 'free@example.com',
        plan_id: PlanId.FREE,
        status: 'active',
      };

      const mockUsage = {
        contracts_created: 0,
      };

      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockSubscription, error: null });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockUsage, error: null });

      const result = await service.checkUsageLimit('free@example.com');

      expect(result.canCreate).toBe(true);
      expect(result.used).toBe(0);
      expect(result.limit).toBe(1);
    });

    it('should indicate when limit is reached', async () => {
      const mockSubscription = {
        id: '123',
        user_email: 'free@example.com',
        plan_id: PlanId.FREE,
        status: 'active',
      };

      const mockUsage = {
        contracts_created: 1,
      };

      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockSubscription, error: null });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockUsage, error: null });

      const result = await service.checkUsageLimit('free@example.com');

      expect(result.canCreate).toBe(false);
      expect(result.used).toBe(1);
      expect(result.limit).toBe(1);
    });
  });

  describe('incrementUsage', () => {
    it('should create new usage record if none exists', async () => {
      const mockNewUsage = {
        id: '789',
        user_email: 'test@example.com',
        date: new Date().toISOString().split('T')[0],
        contracts_created: 1,
      };

      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockNewUsage, error: null });

      const result = await service.incrementUsage('test@example.com');

      expect(result.contracts_created).toBe(1);
    });

    it('should increment existing usage record', async () => {
      const mockExistingUsage = {
        id: '789',
        user_email: 'test@example.com',
        date: new Date().toISOString().split('T')[0],
        contracts_created: 2,
      };

      const mockUpdatedUsage = {
        ...mockExistingUsage,
        contracts_created: 3,
      };

      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockExistingUsage, error: null });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockUpdatedUsage, error: null });

      const result = await service.incrementUsage('test@example.com');

      expect(result.contracts_created).toBe(3);
    });
  });

  describe('getAllSubscriptions', () => {
    it('should return all subscriptions', async () => {
      const mockSubscriptions = [
        { id: '1', user_email: 'user1@example.com', plan_id: PlanId.FREE },
        { id: '2', user_email: 'user2@example.com', plan_id: PlanId.STANDARD },
      ];

      mockSupabaseClient.order.mockResolvedValueOnce({ data: mockSubscriptions, error: null });

      const result = await service.getAllSubscriptions();

      expect(result).toHaveLength(2);
      expect(result[0].plan_id).toBe(PlanId.FREE);
    });
  });
});
