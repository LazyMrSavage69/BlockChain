import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AvatarModule } from './avatar/avatar.module';
import { ContractsController } from './contracts/contracts.controller';
import { ContractsService } from './contracts/contracts.service';
import { ContractsModule } from './contracts/contracts.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { FriendsModule } from './friends/friends.module';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AvatarModule,
    ContractsModule,
    SubscriptionModule,
    FriendsModule,
    MessagesModule,
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class AppModule {}