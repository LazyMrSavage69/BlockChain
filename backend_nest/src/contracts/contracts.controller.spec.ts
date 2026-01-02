import { Test, TestingModule } from '@nestjs/testing';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { SubscriptionService } from '../subscription/subscription.service';

describe('ContractsController', () => {
  let controller: ContractsController;

  // Mock services
  const mockContractsService = {
    getContractById: jest.fn(),
    createContract: jest.fn(),
  };

  const mockSubscriptionService = {
    checkUsageLimit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractsController],
      providers: [
        {
          provide: ContractsService,
          useValue: mockContractsService,
        },
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
      ],
    }).compile();

    controller = module.get<ContractsController>(ContractsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
