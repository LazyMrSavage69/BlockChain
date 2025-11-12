import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
 
  app.use(cookieParser());
  // Stripe webhook requires the raw body to verify signatures
  app.use('/api/subscriptions/webhook', bodyParser.raw({ type: 'application/json' }));

  // Enable CORS for Next.js dev server
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });
 
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Changed to false to allow extra fields like userId
      transform: true,
      transformOptions: {
        enableImplicitConversion: true, // Convert string numbers to numbers
      },
    }),
  );

 
  await app.listen(5000);
  console.log('🚀 NestJS API running on http://localhost:5000');
  console.log('📡 CORS handled by gateway on http://localhost:8000');
}

bootstrap();
