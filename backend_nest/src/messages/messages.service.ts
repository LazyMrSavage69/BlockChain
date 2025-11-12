import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Message, MessageWithUser, Conversation } from './interfaces/message.interface';
import { CreateMessageDto } from './dto/create-message.dto';
import { FriendsService } from '../friends/friends.service';

@Injectable()
export class MessagesService {
  private readonly supabase: SupabaseClient;
  private readonly authServiceUrl: string;

  constructor(private readonly friendsService: FriendsService) {
    // Use service role key if available (bypasses RLS), otherwise use anon key
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        '',
    );
    // In Docker, use service name; locally use localhost
    this.authServiceUrl = process.env.AUTH_SERVICE_URL || 
      (process.env.NODE_ENV === 'production' ? 'http://auth-service:3060' : 'http://localhost:3060');
  }

  private async getUserInfo(userId: number): Promise<{ id: number; name: string; email: string; avatar?: string }> {
    try {
      const response = await fetch(`${this.authServiceUrl}/api/users/${userId}`, {
        method: 'GET',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }
      const user = await response.json();
      
      // Try to get avatar from Supabase
      let avatarUrl: string | undefined;
      try {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
        if (supabaseUrl && supabaseKey) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data: avatarData } = await supabase
            .from('avatars')
            .select('avatar_url')
            .eq('user_id', userId)
            .single();
          
          if (avatarData) {
            avatarUrl = avatarData.avatar_url;
          }
        }
      } catch (err) {
        // Avatar fetch failed, continue without avatar
        console.error('Failed to fetch avatar:', err);
      }
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: avatarUrl || user.avatar,
      };
    } catch (error) {
      return {
        id: userId,
        name: `User ${userId}`,
        email: '',
        avatar: undefined,
      };
    }
  }

  async sendMessage(senderId: number, createDto: CreateMessageDto): Promise<Message> {
    // Ensure both are numbers
    const senderIdNum = typeof senderId === 'string' ? parseInt(senderId, 10) : Number(senderId);
    const receiverIdNum = typeof createDto.receiver_id === 'string' 
      ? parseInt(createDto.receiver_id, 10) 
      : Number(createDto.receiver_id);
    
    console.log('🔍 MessagesService - sendMessage called:', { 
      senderId, 
      senderIdNum,
      receiver_id: createDto.receiver_id,
      receiverIdNum,
      content: createDto.content?.substring(0, 50) + '...',
    });
    
    // Check if users are friends
    const areFriends = await this.friendsService.areFriends(senderIdNum, receiverIdNum);
    console.log('🔍 MessagesService - areFriends result:', areFriends);
    
    if (!areFriends) {
      console.error('🔍 MessagesService - Users are not friends:', { senderIdNum, receiverIdNum });
      throw new ForbiddenException('You can only send messages to friends');
    }

    if (!createDto.content || createDto.content.trim().length === 0) {
      throw new BadRequestException('Message content cannot be empty');
    }

    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        sender_id: senderIdNum,
        receiver_id: receiverIdNum,
        content: createDto.content.trim(),
      })
      .select()
      .single();
    
    console.log('🔍 MessagesService - Message insert result:', { data, error });

    if (error) {
      throw new BadRequestException(`Failed to send message: ${error.message}`);
    }

    return data;
  }

  async getConversation(userId: number, otherUserId: number): Promise<MessageWithUser[]> {
    // Check if users are friends
    const areFriends = await this.friendsService.areFriends(userId, otherUserId);
    if (!areFriends) {
      throw new ForbiddenException('You can only view messages with friends');
    }

    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch messages: ${error.message}`);
    }

    const messagesWithUsers: MessageWithUser[] = await Promise.all(
      (data || []).map(async (message) => {
        const [sender, receiver] = await Promise.all([
          this.getUserInfo(message.sender_id),
          this.getUserInfo(message.receiver_id),
        ]);

        return {
          ...message,
          sender,
          receiver,
        };
      }),
    );

    return messagesWithUsers;
  }

  async getConversations(userId: number): Promise<Conversation[]> {
    // Get all friends
    const friends = await this.friendsService.getFriends(userId);

    // Get conversations for each friend
    const conversations: Conversation[] = await Promise.all(
      friends.map(async (friend) => {
        // Get last message
        const { data: messages, error } = await this.supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${userId},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${userId})`)
          .order('created_at', { ascending: false })
          .limit(1);

        let lastMessage: MessageWithUser | null = null;
        if (messages && messages.length > 0 && !error) {
          const message = messages[0];
          const [sender, receiver] = await Promise.all([
            this.getUserInfo(message.sender_id),
            this.getUserInfo(message.receiver_id),
          ]);
          lastMessage = {
            ...message,
            sender,
            receiver,
          };
        }

        // Get unread count
        const { count } = await this.supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', userId)
          .eq('sender_id', friend.id)
          .is('read_at', null);

        return {
          friend,
          lastMessage,
          unreadCount: count || 0,
        };
      }),
    );

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
    });

    return conversations;
  }

  async markAsRead(messageId: string, userId: number): Promise<Message> {
    // Check if message exists and user is the receiver
    const { data: message, error: fetchError } = await this.supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      throw new NotFoundException('Message not found');
    }

    if (message.receiver_id !== userId) {
      throw new ForbiddenException('You can only mark your own received messages as read');
    }

    const { data, error } = await this.supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to mark message as read: ${error.message}`);
    }

    return data;
  }

  async markConversationAsRead(userId: number, otherUserId: number): Promise<void> {
    // Check if users are friends
    const areFriends = await this.friendsService.areFriends(userId, otherUserId);
    if (!areFriends) {
      throw new ForbiddenException('You can only mark messages with friends as read');
    }

    const { error } = await this.supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('receiver_id', userId)
      .eq('sender_id', otherUserId)
      .is('read_at', null);

    if (error) {
      throw new BadRequestException(`Failed to mark conversation as read: ${error.message}`);
    }
  }
}

