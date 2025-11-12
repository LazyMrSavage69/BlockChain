import { IsNumber, IsNotEmpty, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFriendInvitationDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @Type(() => Number)
  receiver_id: number;
}

