import { Test, TestingModule } from '@nestjs/testing';
import { ContractsService } from './contracts.service';

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
  in: jest.fn(() => mockSupabaseClient),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('ContractsService', () => {
  let service: ContractsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContractsService],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createContract', () => {
    it('should create a contract successfully', async () => {
      const mockContract = {
        id: '123',
        title: 'Test Contract',
        initiator_id: 1,
        status: 'draft',
        created_at: new Date().toISOString(),
      };

      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockContract, error: null });

      const result = await service.createContract({
        title: 'Test Contract',
        summary: 'Contract summary',
        initiatorId: 1,
        counterpartyId: 2,
        clauses: ['Clause 1', 'Clause 2'],
        initiatorAgreed: false,
      });

      expect(result.title).toBe('Test Contract');
      expect(result.status).toBe('draft');
    });

    it('should throw error on database failure', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        service.createContract({
          title: 'Test Contract',
          summary: 'Summary',
          initiatorId: 1,
          counterpartyId: 2,
          clauses: [],
          initiatorAgreed: false,
        }),
      ).rejects.toThrow();
    });
  });

  describe('getContractById', () => {
    it('should return contract by ID', async () => {
      const mockContract = {
        id: '123',
        title: 'Test Contract',
        status: 'active',
      };

      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockContract, error: null });

      const result = await service.getContractById('123');

      expect(result.id).toBe('123');
      expect(result.title).toBe('Test Contract');
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(service.getContractById('nonexistent')).rejects.toThrow();
    });
  });
});
