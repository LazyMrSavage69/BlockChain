import { Body, Controller, Get, Param, Post, Put, Query, Req, NotFoundException, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateSignedContractDto } from './dto/create-signed-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { AcceptContractDto } from './dto/accept-contract.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import Stripe from 'stripe';
import express from 'express';

@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Get()
  async getAll() {
    const templates = await this.contractsService.findAll();
    // Map templates to include all required fields
    return templates.map((template: any) => ({
      id: template.id,
      title: template.title || 'Untitled Template',
      category: template.category || 'Uncategorized',
      description: template.description || '',
      price: template.price || 0,
      rating: template.rating || 0,
      downloads: template.downloads || 0,
      creator: template.creator || 'Unknown', // You may need to fetch creator name from users table
      created_at: template.created_at || new Date().toISOString(),
      visibility: template.visibility !== false,
      schema: template.schema,
      example: template.example,
    }));
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

  @Post('templates/:templateId/checkout')
  @HttpCode(HttpStatus.CREATED)
  async createTemplateCheckout(
    @Param('templateId') templateId: string,
    @Body()
    body: {
      userEmail: string;
      userId: number;
      successUrl: string;
      cancelUrl: string;
    },
  ) {
    console.log('➡️ /contracts/templates/:templateId/checkout called', {
      templateId,
      userEmail: body?.userEmail,
      userId: body?.userId,
    });

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new BadRequestException('Stripe is not configured');
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any });

    // Get template
    const template = await this.contractsService.getTemplateById(templateId);
    if (!template) {
      throw new NotFoundException(`Template with id ${templateId} not found`);
    }

    const price = (template as any).price || 0;
    if (price <= 0) {
      throw new BadRequestException('Template is free, no checkout needed');
    }

    // Create Stripe Checkout Session
    console.log('🧾 Creating Stripe checkout session for template');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(price * 100), // Convert to cents
            product_data: {
              name: (template as any).title || 'Contract Template',
              description: (template as any).description || '',
            },
          },
          quantity: 1,
        },
      ],
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
      metadata: {
        user_email: body.userEmail,
        user_id: String(body.userId),
        template_id: templateId,
        type: 'template_purchase',
      },
    });
    console.log('✅ Stripe session created', { sessionId: session.id });

    // Record transaction in marketplace_transactions
    await this.contractsService.createMarketplaceTransaction({
      buyerId: body.userId.toString(), // Will be converted to UUID if needed
      templateId,
      price,
      paymentStatus: 'pending',
      txHash: session.id,
    });

    return {
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    };
  }
}
