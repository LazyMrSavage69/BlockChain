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
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import express from 'express';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) { }

  private async getUserIdFromRequest(req: express.Request): Promise<number> {
    // Try to get from query params
    if (req.query?.userId) {
      return parseInt(req.query.userId as string, 10);
    }

    // Try to get from body
    if (req.body?.userId) {
      return parseInt(req.body.userId, 10);
    }

    // Try to get from session token via auth service
    const sessionToken = req.cookies?.session_token || req.headers.cookie?.split('session_token=')[1]?.split(';')[0];
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
          response = await fetch(`${gatewayUrl}/api/me`, {
            headers: {
              Cookie: `session_token=${sessionToken}`,
            },
          });
        } catch (gatewayError) {
          response = await fetch(`${authServiceUrl}/api/me`, {
            headers: {
              Cookie: `session_token=${sessionToken}`,
            },
          });
        }

        if (response.ok) {
          const user = await response.json();
          return user.id;
        } else {
          console.error('MessagesController - Auth service error:', response.status);
        }
      } catch (error) {
        console.error('MessagesController - Failed to get user from auth service:', error);
      }
    } else {
      console.error('MessagesController - No session token found');
    }

    throw new BadRequestException('User ID is required');
  }

  @Post()
  async sendMessage(@Body() createDto: any, @Req() req: express.Request) {
    console.log('🔍 MessagesController - sendMessage called');
    console.log('🔍 MessagesController - Request body:', JSON.stringify(req.body));
    console.log('🔍 MessagesController - createDto:', JSON.stringify(createDto));

    // Manual validation
    if (!createDto || !createDto.receiver_id) {
      console.error('🔍 MessagesController - Missing receiver_id');
      throw new BadRequestException('receiver_id is required');
    }

    if (!createDto || !createDto.content || createDto.content.trim().length === 0) {
      console.error('🔍 MessagesController - Missing or empty content');
      throw new BadRequestException('content is required and cannot be empty');
    }

    try {
      const senderId = await this.getUserIdFromRequest(req);
      console.log('🔍 MessagesController - Sender ID:', senderId);

      const properDto: CreateMessageDto = {
        receiver_id: typeof createDto.receiver_id === 'number'
          ? createDto.receiver_id
          : parseInt(String(createDto.receiver_id), 10),
        content: createDto.content,
      };

      const message = await this.messagesService.sendMessage(senderId, properDto);
      return {
        success: true,
        data: message,
      };
    } catch (error) {
      console.error('🔍 MessagesController - Error in sendMessage:', error);
      if (error instanceof Error) {
        console.error('🔍 MessagesController - Error message:', error.message);
        console.error('🔍 MessagesController - Error stack:', error.stack);
      }
      throw error;
    }
  }

  @Get('conversations')
  async getConversations(@Req() req: express.Request) {
    const userId = await this.getUserIdFromRequest(req);
    const conversations = await this.messagesService.getConversations(userId);
    return {
      success: true,
      data: conversations,
    };
  }

  @Get('conversation/:otherUserId')
  async getConversation(@Param('otherUserId') otherUserId: string, @Req() req: express.Request) {
    const userId = await this.getUserIdFromRequest(req);
    const messages = await this.messagesService.getConversation(userId, parseInt(otherUserId, 10));
    return {
      success: true,
      data: messages,
    };
  }

  @Put('read/:messageId')
  async markAsRead(@Param('messageId') messageId: string, @Req() req: express.Request) {
    const userId = await this.getUserIdFromRequest(req);
    const message = await this.messagesService.markAsRead(messageId, userId);
    return {
      success: true,
      data: message,
    };
  }

  @Put('read-conversation/:otherUserId')
  async markConversationAsRead(@Param('otherUserId') otherUserId: string, @Req() req: express.Request) {
    const userId = await this.getUserIdFromRequest(req);
    await this.messagesService.markConversationAsRead(userId, parseInt(otherUserId, 10));
    return {
      success: true,
      message: 'Conversation marked as read',
    };
  }
}

