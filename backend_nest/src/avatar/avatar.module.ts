import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AvatarController } from './avatar.controller';
import { AvatarService } from './avatar.service';
import { Avatar, AvatarSchema } from './schemas/avatar.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Avatar.name, schema: AvatarSchema }]),
  ],
  controllers: [AvatarController],
  providers: [AvatarService],
  exports: [AvatarService],
})
export class AvatarModule {}