import { Injectable, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateAvatarDto, UpdateAvatarDto } from './dto/avatar.dto';
import { Avatar } from './interfaces/avatar.interface';

@Injectable()
export class AvatarService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || '',
    );
  }

  async saveAvatar(createAvatarDto: CreateAvatarDto): Promise<Avatar> {
    try {
      console.log('📝 Attempting to save avatar:', createAvatarDto);

      const { userId, email, name, avatarUrl, style, seed } = createAvatarDto;

      // Check if avatar exists
      const { data: existingAvatar } = await this.supabase
        .from('avatars')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingAvatar) {
        // Update existing avatar
        const { data, error } = await this.supabase
          .from('avatars')
          .update({
            avatar_url: avatarUrl,
            style,
            seed,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        console.log('✅ Updated existing avatar:', data.id);
        return data;
      }

      // Create new avatar
      const { data, error } = await this.supabase
        .from('avatars')
        .insert({
          user_id: userId,
          email,
          name,
          avatar_url: avatarUrl,
          style,
          seed,
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Saved new avatar with id:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error saving avatar:', error);
      throw error;
    }
  }

  async getAvatarByUserId(userId: number): Promise<Avatar> {
    const { data, error } = await this.supabase
      .from('avatars')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Avatar not found for user ${userId}`);
    }

    return data;
  }

  async updateAvatar(
    userId: number,
    updateAvatarDto: UpdateAvatarDto,
  ): Promise<Avatar> {
    const { data, error } = await this.supabase
      .from('avatars')
      .update({
        ...updateAvatarDto,
        avatar_url: updateAvatarDto.avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(`Avatar not found for user ${userId}`);
    }

    return data;
  }

  async deleteAvatar(userId: number): Promise<void> {
    const { error } = await this.supabase
      .from('avatars')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new NotFoundException(`Avatar not found for user ${userId}`);
    }
  }

  async getAllAvatars(): Promise<Avatar[]> {
    const { data, error } = await this.supabase
      .from('avatars')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}