import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,  // ADD THIS
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import express from 'express';  // ADD THIS
import { AvatarService } from './avatar.service';
import { CreateAvatarDto, UpdateAvatarDto } from './dto/avatar.dto';

@Controller('api/avatars')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async saveAvatar(
    @Body() createAvatarDto: CreateAvatarDto,
    @Req() req: express.Request,  // CHANGED
  ) {
    const sessionToken = req.cookies?.session_token;  // CHANGED
    
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

  // Update other methods similarly
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
    @Req() req: express.Request,  // CHANGED
  ) {
    const sessionToken = req.cookies?.session_token;  // CHANGED
    
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
    @Req() req: express.Request,  // CHANGED
  ) {
    const sessionToken = req.cookies?.session_token;  // CHANGED
    
    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }
    
    await this.avatarService.deleteAvatar(userId);
  }
}