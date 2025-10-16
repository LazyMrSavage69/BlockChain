import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AvatarService } from './avatar.service';
import { CreateAvatarDto, UpdateAvatarDto } from './dto/avatar.dto';

@Controller('api/avatars')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async saveAvatar(
    @Body() createAvatarDto: CreateAvatarDto,
    @Headers('x-session-token') sessionToken: string,
  ) {
    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }

    const avatar = await this.avatarService.saveAvatar(createAvatarDto);
    return {
      success: true,
      message: 'Avatar saved successfully',
      data: avatar,
    };
  }

  @Get(':userId')
  async getAvatar(@Param('userId') userId: number) {
    const avatar = await this.avatarService.getAvatarByUserId(userId);
    return {
      success: true,
      data: avatar,
    };
  }

  @Put(':userId')
  async updateAvatar(
    @Param('userId') userId: number,
    @Body() updateAvatarDto: UpdateAvatarDto,
    @Headers('x-session-token') sessionToken: string,
  ) {
    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }

    const avatar = await this.avatarService.updateAvatar(
      userId,
      updateAvatarDto,
    );
    return {
      success: true,
      message: 'Avatar updated successfully',
      data: avatar,
    };
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAvatar(
    @Param('userId') userId: number,
    @Headers('x-session-token') sessionToken: string,
  ) {
    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }

    await this.avatarService.deleteAvatar(userId);
  }
}