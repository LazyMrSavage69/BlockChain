import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

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
 
  // CORS is handled by the gateway - don't enable it here
  // This prevents duplicate CORS headers
  // app.enableCors() is removed
 
  await app.listen(5000);
  console.log('🚀 NestJS API running on http://localhost:5000');
  console.log('📡 CORS handled by gateway on http://localhost:8000');
}

bootstrap();
