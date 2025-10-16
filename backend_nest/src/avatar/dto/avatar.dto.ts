import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateAvatarDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  avatarUrl: string;

  @IsString()
  @IsNotEmpty()
  style: string;

  @IsString()
  @IsNotEmpty()
  seed: string;
}

export class UpdateAvatarDto {
  @IsString()
  avatarUrl?: string;

  @IsString()
  style?: string;

  @IsString()
  seed?: string;
}