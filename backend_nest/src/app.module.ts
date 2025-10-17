import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AvatarModule } from './avatar/avatar.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/miniprojet',
      {
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            console.log('✅ MongoDB connected successfully');
            console.log('📍 Database name:', connection.db?.databaseName);
          });
          connection.on('error', (error) => {
            console.error('❌ MongoDB connection error:', error);
          });
          return connection;
        },
      }
    ),
    AvatarModule,
  ],
})
export class AppModule {}