import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateFriendInvitationDto {
  @IsNotEmpty()
  @IsIn(['accepted', 'rejected'])
  status: 'accepted' | 'rejected';
}

