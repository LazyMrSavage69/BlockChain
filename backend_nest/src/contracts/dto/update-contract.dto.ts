import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClauseDto)
  clauses?: ClauseDto[];
}

