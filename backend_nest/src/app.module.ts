import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AvatarModule } from './avatar/avatar.module';
import { ContractsModule } from './contracts/contracts.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { FriendsModule } from './friends/friends.module';
import { MessagesModule } from './messages/messages.module';
import { DashboardModule } from './dashboard/dashboard.module';

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
    DashboardModule,
  ],
})
export class AppModule { }