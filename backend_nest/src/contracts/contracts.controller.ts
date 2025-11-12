import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateSignedContractDto } from './dto/create-signed-contract.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import express from 'express';

@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Get()
  async getAll() {
    return this.contractsService.findAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  @Get('user/:userId')
  async getUserContracts(@Param('userId') userId: number) {
    const contracts = await this.contractsService.getUserContracts(userId);
    return {
      success: true,
      data: contracts,
    };
  }

  @Post('signed')
  async createSignedContract(
    @Body() payload: CreateSignedContractDto,
    @Req() req: express.Request,
  ) {
    // Get user email from request body or auth middleware
    const userEmail = payload.userEmail || (req as any).userEmail || req.body?.userEmail;

    if (userEmail) {
      // Check usage limit before creating
      const usageCheck = await this.subscriptionService.checkUsageLimit(userEmail);
      if (!usageCheck.canCreate) {
        throw new Error(
          `Daily limit reached. You have used ${usageCheck.used} of ${usageCheck.limit} contracts today.`,
        );
      }

      // Create contract
      const contract = await this.contractsService.createSignedContract(payload);

      // Increment usage tracking
      await this.subscriptionService.incrementUsage(userEmail);

      return {
        success: true,
        data: contract,
        usage: {
          used: usageCheck.used + 1,
          limit: usageCheck.limit,
        },
      };
    }

    // Fallback if no email (shouldn't happen in production)
    const contract = await this.contractsService.createSignedContract(payload);
    return {
      success: true,
      data: contract,
    };
  }
}
