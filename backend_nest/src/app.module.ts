import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AvatarModule } from './avatar/avatar.module';
import { ContractsController } from './contracts/contracts.controller';
import { ContractsService } from './contracts/contracts.service';
import { ContractsModule } from './contracts/contracts.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AvatarModule,ContractsModule
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class AppModule {}