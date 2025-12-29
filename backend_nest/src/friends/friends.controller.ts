import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { CreateFriendInvitationDto } from './dto/create-friend-invitation.dto';
import { UpdateFriendInvitationDto } from './dto/update-friend-invitation.dto';
import express from 'express';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) { }

  private async getUserIdFromRequest(req: express.Request): Promise<number> {
    console.log('🔍 FriendsController - getUserIdFromRequest called');
    console.log('🔍 FriendsController - req.body:', JSON.stringify(req.body));
    console.log('🔍 FriendsController - req.query:', JSON.stringify(req.query));
    console.log('🔍 FriendsController - req.cookies:', JSON.stringify(req.cookies));
    console.log('🔍 FriendsController - req.headers.cookie:', req.headers.cookie);

    // Try to get from body first (most reliable from frontend)
    if (req.body?.userId !== undefined && req.body?.userId !== null) {
      const userId = typeof req.body.userId === 'number' ? req.body.userId : parseInt(String(req.body.userId), 10);
      if (!isNaN(userId) && userId > 0) {
        console.log('🔍 FriendsController - Using userId from body:', userId);
        return userId;
      } else {
        console.error('🔍 FriendsController - Invalid userId in body:', req.body.userId);
      }
    }

    // Try to get from query params
    if (req.query?.userId) {
      const userId = parseInt(req.query.userId as string, 10);
      if (!isNaN(userId) && userId > 0) {
        console.log('🔍 FriendsController - Using userId from query:', userId);
        return userId;
      }
    }

    // Try to get from session token via auth service
    const sessionToken = req.cookies?.session_token || req.headers.cookie?.split('session_token=')[1]?.split(';')[0];

    console.log('🔍 FriendsController - Request cookies:', req.cookies);
    console.log('🔍 FriendsController - Request headers.cookie:', req.headers.cookie);
    console.log('🔍 FriendsController - Extracted session token:', sessionToken ? sessionToken.substring(0, 20) + '...' : 'NOT FOUND');

    if (sessionToken) {
      try {
        // Try using gateway URL first (for Docker), then fallback to direct auth service
        const gatewayUrl = process.env.GATEWAY_URL ||
          (process.env.NODE_ENV === 'production' ? 'http://gateway-service:8000' : 'http://localhost:8000');
        const authServiceUrl = process.env.AUTH_SERVICE_URL ||
          (process.env.NODE_ENV === 'production' ? 'http://auth-service:3060' : 'http://localhost:3060');

        // Try gateway first (recommended for Docker)
        let response;
        try {
          console.log('🔍 FriendsController - Trying gateway URL:', `${gatewayUrl}/api/me`);
          response = await fetch(`${gatewayUrl}/api/me`, {
            headers: {
              Cookie: `session_token=${sessionToken}`,
            },
          });
        } catch (gatewayError) {
          console.log('🔍 FriendsController - Gateway failed, trying auth service directly:', authServiceUrl);
          response = await fetch(`${authServiceUrl}/api/me`, {
            headers: {
              Cookie: `session_token=${sessionToken}`,
            },
          });
        }

        console.log('🔍 FriendsController - Response status:', response.status);

        if (response.ok) {
          const user = await response.json();
          console.log('🔍 FriendsController - User ID found:', user.id);
          return user.id;
        } else {
          const errorText = await response.text();
          console.error('🔍 FriendsController - Auth service error:', response.status, errorText);
        }
      } catch (error) {
        console.error('🔍 FriendsController - Failed to get user from auth service:', error);
        if (error instanceof Error) {
          console.error('🔍 FriendsController - Error message:', error.message);
          console.error('🔍 FriendsController - Error stack:', error.stack);
        }
      }
    } else {
      console.error('🔍 FriendsController - No session token found in cookies or headers');
      console.error('🔍 FriendsController - Full request object keys:', Object.keys(req));
    }

    throw new BadRequestException('User ID is required. Please ensure you are logged in.');
  }

  @Post('invitations')
  async sendInvitation(@Body() createDto: any, @Req() req: express.Request) {
    console.log('🔍 FriendsController - sendInvitation called');
    console.log('🔍 FriendsController - Raw request body:', JSON.stringify(req.body));
    console.log('🔍 FriendsController - createDto:', JSON.stringify(createDto));

    // Manual validation and transformation
    let receiverId: number;
    if (createDto?.receiver_id !== undefined) {
      receiverId = typeof createDto.receiver_id === 'number'
        ? createDto.receiver_id
        : parseInt(String(createDto.receiver_id), 10);

      if (isNaN(receiverId) || receiverId <= 0) {
        console.error('🔍 FriendsController - Invalid receiver_id:', createDto.receiver_id);
        throw new BadRequestException('receiver_id must be a positive number');
      }
    } else {
      console.error('🔍 FriendsController - Missing receiver_id');
      throw new BadRequestException('receiver_id is required');
    }

    try {
      const senderId = await this.getUserIdFromRequest(req);
      console.log('🔍 FriendsController - Sender ID:', senderId);
      console.log('🔍 FriendsController - Receiver ID:', receiverId);

      // Create proper DTO
      const invitationDto: CreateFriendInvitationDto = {
        receiver_id: receiverId,
      };

      const invitation = await this.friendsService.sendInvitation(senderId, invitationDto);

      // If invitation already exists, return success with existing invitation
      return {
        success: true,
        data: invitation,
        message: invitation.id ? 'Invitation sent successfully' : 'Invitation already exists',
      };
    } catch (error) {
      console.error('🔍 FriendsController - Error in sendInvitation:', error);
      if (error instanceof Error) {
        console.error('🔍 FriendsController - Error message:', error.message);
        console.error('🔍 FriendsController - Error stack:', error.stack);
      }
      throw error;
    }
  }

  @Get('invitations')
  async getInvitations(@Req() req: express.Request) {
    const userId = await this.getUserIdFromRequest(req);
    const invitations = await this.friendsService.getInvitations(userId);
    return {
      success: true,
      data: invitations,
    };
  }

  @Get('invitations/pending')
  async getPendingInvitations(@Req() req: express.Request) {
    const userId = await this.getUserIdFromRequest(req);
    const invitations = await this.friendsService.getPendingInvitations(userId);
    return {
      success: true,
      data: invitations,
    };
  }

  @Put('invitations/:id')
  async updateInvitation(
    @Param('id') id: string,
    @Body() updateDto: any,
    @Req() req: express.Request,
  ) {
    console.log('🔍 FriendsController - updateInvitation called');
    console.log('🔍 FriendsController - Invitation ID:', id);
    console.log('🔍 FriendsController - Request body:', JSON.stringify(req.body));
    console.log('🔍 FriendsController - updateDto:', JSON.stringify(updateDto));

    // Manual validation
    if (!updateDto || !updateDto.status) {
      console.error('🔍 FriendsController - Missing status in updateDto');
      throw new BadRequestException('status is required (accepted or rejected)');
    }

    if (updateDto.status !== 'accepted' && updateDto.status !== 'rejected') {
      console.error('🔍 FriendsController - Invalid status:', updateDto.status);
      throw new BadRequestException('status must be either "accepted" or "rejected"');
    }

    try {
      const userId = await this.getUserIdFromRequest(req);
      console.log('🔍 FriendsController - User ID:', userId);

      const properDto: UpdateFriendInvitationDto = {
        status: updateDto.status,
      };

      const invitation = await this.friendsService.updateInvitation(id, userId, properDto);
      return {
        success: true,
        data: invitation,
      };
    } catch (error) {
      console.error('🔍 FriendsController - Error in updateInvitation:', error);
      if (error instanceof Error) {
        console.error('🔍 FriendsController - Error message:', error.message);
        console.error('🔍 FriendsController - Error stack:', error.stack);
      }
      throw error;
    }
  }

  @Get()
  async getFriends(@Req() req: express.Request) {
    const userId = await this.getUserIdFromRequest(req);
    const friends = await this.friendsService.getFriends(userId);
    return {
      success: true,
      data: friends,
    };
  }

  @Get('check/:otherUserId')
  async areFriends(@Param('otherUserId') otherUserId: string, @Req() req: express.Request) {
    const userId = await this.getUserIdFromRequest(req);
    const areFriends = await this.friendsService.areFriends(userId, parseInt(otherUserId, 10));
    return {
      success: true,
      data: { areFriends },
    };
  }
}

