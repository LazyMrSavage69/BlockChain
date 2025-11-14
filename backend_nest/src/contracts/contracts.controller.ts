import { Body, Controller, Get, Param, Post, Put, Query, Req, NotFoundException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateSignedContractDto } from './dto/create-signed-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { AcceptContractDto } from './dto/accept-contract.dto';
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
    console.log(`[ContractsController] Getting contract with id: ${id}`);
    try {
      const contract = await this.contractsService.getContractById(id);
      console.log(`[ContractsController] Found contract: ${contract.id}`);
      return contract;
    } catch (error: any) {
      console.log(`[ContractsController] Contract not found: ${error.message}`);
      throw new NotFoundException(`Contract with id ${id} not found`);
    }
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

  @Put(':id/update')
  async updateContract(
    @Param('id') id: string,
    @Body() updateDto: UpdateContractDto,
  ) {
    const contract = await this.contractsService.updateContract(id, updateDto);
    return {
      success: true,
      data: contract,
    };
  }

  @Post(':id/accept')
  async acceptContract(
    @Param('id') id: string,
    @Body() acceptDto: AcceptContractDto,
  ) {
    const contract = await this.contractsService.acceptContract(id, acceptDto.userId);
    return {
      success: true,
      data: contract,
      isSigned: contract.status === 'fully_signed' || 'contract_id' in contract,
    };
  }
}
