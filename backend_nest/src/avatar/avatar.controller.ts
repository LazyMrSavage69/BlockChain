import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import express from 'express';
import { AvatarService } from './avatar.service';
import { CreateAvatarDto, UpdateAvatarDto } from './dto/avatar.dto';
import { Avatar } from './interfaces/avatar.interface';

@Controller('api/avatars')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async health() {
    return { status: 'ok', service: 'avatar-service' };
  }

  // NEW: Check if user has avatar
  @Get('check/:userId')
  async checkAvatar(@Param('userId') userId: number) {
    try {
      const avatar = await this.avatarService.getAvatarByUserId(userId);
      return {
        success: true,
        hasAvatar: true,
        data: avatar,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: true,
          hasAvatar: false,
          data: null,
        };
      }
      throw error;
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async saveAvatar(
    @Body() createAvatarDto: CreateAvatarDto,
    @Req() req: express.Request,
  ) {
    console.log('🍪 Cookies received:', req.cookies);
    console.log('📋 Headers:', req.headers);
    
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken) {
      console.log('❌ No session token found in cookies');
      throw new UnauthorizedException('No session token provided');
    }

    console.log('✅ Session token found:', sessionToken.substring(0, 10) + '...');

    const avatar = await this.avatarService.saveAvatar(createAvatarDto);
    return {
      success: true,
      message: 'Avatar saved successfully',
      data: avatar,
    };
  }

  @Get(':userId')
  async getAvatar(@Param('userId') userId: number): Promise<{
    success: boolean;
    data: Avatar;
  }> {
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
    @Req() req: express.Request,
  ): Promise<{
    success: boolean;
    message: string;
    data: Avatar;
  }> {
    const sessionToken = req.cookies?.session_token;

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
    @Req() req: express.Request,
  ): Promise<void> {
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }

    await this.avatarService.deleteAvatar(userId);
  }
}