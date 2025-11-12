import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FriendInvitation, FriendInvitationWithUser, Friend } from './interfaces/friend-invitation.interface';
import { CreateFriendInvitationDto } from './dto/create-friend-invitation.dto';
import { UpdateFriendInvitationDto } from './dto/update-friend-invitation.dto';

@Injectable()
export class FriendsService {
  private readonly supabase: SupabaseClient;
  private readonly authServiceUrl: string;

  constructor() {
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

  async sendInvitation(senderId: number, createDto: CreateFriendInvitationDto): Promise<FriendInvitation> {
    if (senderId === createDto.receiver_id) {
      throw new BadRequestException('Cannot send invitation to yourself');
    }

    console.log('🔍 FriendsService - sendInvitation:', { senderId, receiver_id: createDto.receiver_id });

    // Check if invitation already exists - check both directions
    const { data: existingData, error: checkError } = await this.supabase
      .from('friend_invitations')
      .select('*')
      .or(`and(sender_id.eq.${senderId},receiver_id.eq.${createDto.receiver_id}),and(sender_id.eq.${createDto.receiver_id},receiver_id.eq.${senderId})`);
    
    console.log('🔍 FriendsService - Existing invitations check:', { existingData, checkError });

    if (checkError) {
      console.error('🔍 FriendsService - Error checking existing invitations:', checkError);
    }

    const existing = existingData && existingData.length > 0 ? existingData[0] : null;

    if (existing) {
      console.log('🔍 FriendsService - Found existing invitation:', existing);
      if (existing.status === 'accepted') {
        throw new ConflictException('Users are already friends');
      }
      if (existing.status === 'pending' && existing.sender_id === senderId) {
        // Return the existing invitation instead of throwing error
        console.log('🔍 FriendsService - Invitation already exists, returning existing one');
        const sender = await this.getUserInfo(existing.sender_id);
        const receiver = await this.getUserInfo(existing.receiver_id);
        return {
          ...existing,
          sender,
          receiver,
        } as any;
      }
      if (existing.status === 'pending' && existing.receiver_id === senderId) {
        throw new ConflictException('This user has already sent you an invitation. Please check your pending invitations.');
      }
    }

    console.log('🔍 FriendsService - Creating new invitation...');
    const { data, error } = await this.supabase
      .from('friend_invitations')
      .insert({
        sender_id: senderId,
        receiver_id: createDto.receiver_id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('🔍 FriendsService - Error creating invitation:', error);
      throw new BadRequestException(`Failed to create invitation: ${error.message}`);
    }

    console.log('🔍 FriendsService - Invitation created successfully:', data);
    return data;
  }

  async getInvitations(userId: number): Promise<FriendInvitationWithUser[]> {
    const { data, error } = await this.supabase
      .from('friend_invitations')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch invitations: ${error.message}`);
    }

    const invitationsWithUsers: FriendInvitationWithUser[] = await Promise.all(
      (data || []).map(async (invitation) => {
        const [sender, receiver] = await Promise.all([
          this.getUserInfo(invitation.sender_id),
          this.getUserInfo(invitation.receiver_id),
        ]);

        return {
          ...invitation,
          sender,
          receiver,
        };
      }),
    );

    return invitationsWithUsers;
  }

  async getPendingInvitations(userId: number): Promise<FriendInvitationWithUser[]> {
    console.log('🔍 FriendsService - getPendingInvitations for userId:', userId);
    
    const { data, error } = await this.supabase
      .from('friend_invitations')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    console.log('🔍 FriendsService - Raw pending invitations query result:', { data, error });

    if (error) {
      console.error('🔍 FriendsService - Error fetching pending invitations:', error);
      throw new BadRequestException(`Failed to fetch pending invitations: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('🔍 FriendsService - No pending invitations found for userId:', userId);
      return [];
    }

    console.log('🔍 FriendsService - Found', data.length, 'pending invitations');

    const invitationsWithUsers: FriendInvitationWithUser[] = await Promise.all(
      (data || []).map(async (invitation) => {
        console.log('🔍 FriendsService - Processing invitation:', invitation.id, 'sender_id:', invitation.sender_id);
        const sender = await this.getUserInfo(invitation.sender_id);
        console.log('🔍 FriendsService - Sender info:', sender);
        return {
          ...invitation,
          sender,
        };
      }),
    );

    console.log('🔍 FriendsService - Returning', invitationsWithUsers.length, 'invitations with user info');
    return invitationsWithUsers;
  }

  async updateInvitation(
    invitationId: string,
    userId: number,
    updateDto: UpdateFriendInvitationDto,
  ): Promise<FriendInvitation> {
    console.log('🔍 FriendsService - updateInvitation called:', { invitationId, userId, status: updateDto.status });
    
    // Check if invitation exists and user is the receiver
    const { data: invitation, error: fetchError } = await this.supabase
      .from('friend_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    console.log('🔍 FriendsService - Fetched invitation:', { invitation, fetchError });

    if (fetchError || !invitation) {
      console.error('🔍 FriendsService - Invitation not found:', fetchError);
      throw new NotFoundException('Invitation not found');
    }

    // Ensure both are numbers for comparison
    const receiverId = typeof invitation.receiver_id === 'string' 
      ? parseInt(invitation.receiver_id, 10) 
      : Number(invitation.receiver_id);
    const userIdNum = typeof userId === 'string' 
      ? parseInt(userId as string, 10) 
      : Number(userId);

    console.log('🔍 FriendsService - Invitation details:', {
      receiver_id: invitation.receiver_id,
      receiverId,
      userId,
      userIdNum,
      status: invitation.status,
      types: {
        receiver_id_type: typeof invitation.receiver_id,
        userId_type: typeof userId,
      },
    });

    if (receiverId !== userIdNum) {
      console.error('🔍 FriendsService - User is not the receiver:', {
        invitation_receiver_id: invitation.receiver_id,
        receiverId,
        userId,
        userIdNum,
      });
      throw new BadRequestException(`You can only respond to invitations sent to you. Expected receiver_id: ${receiverId}, got userId: ${userIdNum}`);
    }

    if (invitation.status !== 'pending') {
      console.error('🔍 FriendsService - Invitation is not pending:', invitation.status);
      throw new BadRequestException(`Invitation is no longer pending. Current status: ${invitation.status}`);
    }

    console.log('🔍 FriendsService - Updating invitation status to:', updateDto.status);
    const { data, error } = await this.supabase
      .from('friend_invitations')
      .update({ status: updateDto.status })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) {
      console.error('🔍 FriendsService - Error updating invitation:', error);
      throw new BadRequestException(`Failed to update invitation: ${error.message}`);
    }

    console.log('🔍 FriendsService - Invitation updated successfully:', data);
    return data;
  }

  async getFriends(userId: number): Promise<Friend[]> {
    const { data, error } = await this.supabase
      .from('friend_invitations')
      .select('*')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (error) {
      throw new BadRequestException(`Failed to fetch friends: ${error.message}`);
    }

    const friends: Friend[] = await Promise.all(
      (data || []).map(async (invitation) => {
        const friendId = invitation.sender_id === userId ? invitation.receiver_id : invitation.sender_id;
        const friendInfo = await this.getUserInfo(friendId);
        return {
          ...friendInfo,
          friendship_id: invitation.id,
          created_at: invitation.created_at,
        };
      }),
    );

    return friends;
  }

  async areFriends(userId1: number, userId2: number): Promise<boolean> {
    // Ensure both are numbers
    const id1 = typeof userId1 === 'string' ? parseInt(userId1, 10) : Number(userId1);
    const id2 = typeof userId2 === 'string' ? parseInt(userId2, 10) : Number(userId2);
    
    console.log('🔍 FriendsService - areFriends called:', { userId1, userId2, id1, id2 });
    
    const { data, error } = await this.supabase
      .from('friend_invitations')
      .select('id, sender_id, receiver_id, status')
      .eq('status', 'accepted')
      .or(`and(sender_id.eq.${id1},receiver_id.eq.${id2}),and(sender_id.eq.${id2},receiver_id.eq.${id1})`);

    console.log('🔍 FriendsService - areFriends query result:', { data, error, count: data?.length || 0 });

    if (error) {
      console.error('🔍 FriendsService - Error checking friendship:', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.log('🔍 FriendsService - No accepted invitation found between users:', { id1, id2 });
      return false;
    }

    console.log('🔍 FriendsService - Users are friends:', { id1, id2, invitationId: data[0].id });
    return true;
  }
}

