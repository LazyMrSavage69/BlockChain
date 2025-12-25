import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ClauseDto {
  @IsString()
  title: string;

  @IsString()
  body: string;
}

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  // Used when assigning/inviting a counterparty
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  counterpartyId?: number;

  // Allow updating workflow status when needed (e.g., after counterparty assignment)
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClauseDto)
  clauses?: ClauseDto[];
}

