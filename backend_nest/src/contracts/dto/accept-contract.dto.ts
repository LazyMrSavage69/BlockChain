import { IsInt } from 'class-validator';

export class AcceptContractDto {
  @IsInt()
  userId: number;
}

