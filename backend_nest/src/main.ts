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
  // Enable CORS
  const gatewayUrl = process.env.GATEWAY_URL || 'http://4.251.143.80.nip.io';
  const frontendUrl = process.env.FRONTEND_URL || 'http://4.251.143.80.nip.io';

  app.enableCors({
    origin: [gatewayUrl, frontendUrl, 'http://4.251.143.80.nip.io'],
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
  console.log(`🚀 NestJS API running on port 5000`);
  console.log(`📡 CORS enabled for: ${gatewayUrl}, ${frontendUrl}`);
}

bootstrap();
