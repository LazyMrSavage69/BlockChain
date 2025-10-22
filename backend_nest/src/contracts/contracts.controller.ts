import { Controller, Get, Param } from '@nestjs/common';
import { ContractsService } from './contracts.service';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  async getAll() {
    return this.contractsService.findAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }
}
