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
    const { userId } = createAvatarDto;

    const existingAvatar = await this.avatarModel.findOne({ userId });

    if (existingAvatar) {
      existingAvatar.avatarUrl = createAvatarDto.avatarUrl;
      existingAvatar.style = createAvatarDto.style;
      existingAvatar.seed = createAvatarDto.seed;
      return existingAvatar.save();
    }

    const newAvatar = new this.avatarModel(createAvatarDto);
    return newAvatar.save();
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