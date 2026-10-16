import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.getHttpAdapter().getInstance().set('trust proxy', Number(process.env.TRUST_PROXY ?? 0)); // number of reverse proxies in front (correct client IPs for rate limiting)
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: process.env.WEB_ORIGIN, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
  const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('SocialPilot AI API').setVersion('0.1').addBearerAuth().build());
  SwaggerModule.setup('api/docs', app, doc);
  }
  await app.listen(Number(process.env.API_PORT ?? 4000));
}
bootstrap();
