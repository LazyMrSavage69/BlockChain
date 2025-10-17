import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Avatar } from './schemas/avatar.schema';
import { CreateAvatarDto, UpdateAvatarDto } from './dto/avatar.dto';

@Injectable()
export class AvatarService {
  constructor(
    @InjectModel(Avatar.name) private avatarModel: Model<Avatar>,
  ) {}

  async saveAvatar(createAvatarDto: CreateAvatarDto): Promise<Avatar> {
    try {
      console.log('📝 Attempting to save avatar:', createAvatarDto);
      
      const { userId } = createAvatarDto;
      const existingAvatar = await this.avatarModel.findOne({ userId });
      
      console.log('🔍 Existing avatar check:', existingAvatar ? 'Found' : 'Not found');
      
      if (existingAvatar) {
        existingAvatar.avatarUrl = createAvatarDto.avatarUrl;
        existingAvatar.style = createAvatarDto.style;
        existingAvatar.seed = createAvatarDto.seed;
        const saved = await existingAvatar.save();
        console.log('✅ Updated existing avatar:', saved._id);
        return saved;
      }
      
      const newAvatar = new this.avatarModel(createAvatarDto);
      console.log('🆕 Creating new avatar document');
      const saved = await newAvatar.save();
      console.log('✅ Saved new avatar with _id:', saved._id);
      
      // VERIFY IT WAS SAVED
      const verify = await this.avatarModel.findById(saved._id);
      console.log('🔍 Verification check:', verify ? 'SUCCESS - Found in DB' : 'FAILED - Not in DB');
      
      return saved;
    } catch (error) {
      console.error('❌ Error saving avatar:', error);
      throw error;
    }
  }

  async getAvatarByUserId(userId: number): Promise<Avatar> {
    const avatar = await this.avatarModel.findOne({ userId });
    if (!avatar) {
      throw new NotFoundException(`Avatar not found for user ${userId}`);
    }
    return avatar;
  }

  async updateAvatar(
    userId: number,
    updateAvatarDto: UpdateAvatarDto,
  ): Promise<Avatar> {
    const avatar = await this.avatarModel.findOne({ userId });
    if (!avatar) {
      throw new NotFoundException(`Avatar not found for user ${userId}`);
    }
    Object.assign(avatar, updateAvatarDto);
    return avatar.save();
  }

  async deleteAvatar(userId: number): Promise<void> {
    const result = await this.avatarModel.deleteOne({ userId });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Avatar not found for user ${userId}`);
    }
  }

  async getAllAvatars(): Promise<Avatar[]> {
    return this.avatarModel.find().sort({ createdAt: -1 });
  }
}