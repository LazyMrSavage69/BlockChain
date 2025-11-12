import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ClauseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;
}

export class CreateSignedContractDto {
  @IsInt()
  initiatorId: number;

  @IsInt()
  counterpartyId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClauseDto)
  clauses: ClauseDto[];

  @IsArray()
  @IsString({ each: true })
  suggestions: string[];

  @IsOptional()
  rawText?: string | null;

  @IsBoolean()
  initiatorAgreed: boolean;

  @IsBoolean()
  counterpartyAgreed: boolean;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  userEmail?: string;
}

