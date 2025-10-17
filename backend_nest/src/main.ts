import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import * as mongoose from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(cookieParser());
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  app.enableCors({
    origin: 'http://localhost:8000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'x-session-token', 'Cookie'],
  });
  
  await app.listen(5000);
  console.log('🚀 NestJS API running on http://localhost:5000');
  
  // CHECK MONGODB CONNECTION
  console.log('🔍 Checking MongoDB connection...');
  console.log('Connection state:', mongoose.connection.readyState); // 0=disconnected, 1=connected
  console.log('Database name:', mongoose.connection.db?.databaseName);
  console.log('Host:', mongoose.connection.host);
}
bootstrap();