import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AvatarModule } from './avatar/avatar.module';
import { ContractsController } from './contracts/contracts.controller';
import { ContractsService } from './contracts/contracts.service';
import { ContractsModule } from './contracts/contracts.module';
import { SubscriptionModule } from './subscription/subscription.module'; 

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AvatarModule,
    ContractsModule,
    SubscriptionModule, 
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class AppModule {}