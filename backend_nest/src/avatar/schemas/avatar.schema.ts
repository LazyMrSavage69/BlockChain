import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Avatar extends Document {
  @Prop({ required: true, unique: true })
  userId: number;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  avatarUrl: string;

  @Prop({ required: true })
  style: string;

  @Prop({ required: true })
  seed: string;
}

export const AvatarSchema = SchemaFactory.createForClass(Avatar);