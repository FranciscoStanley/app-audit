import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { API_V1_PREFIX, APP_VERSION } from './config/api-version';
import {
  isProduction,
  isSwaggerEnabled,
  validateProductionEnv,
} from './config/env.validation';

async function bootstrap() {
  validateProductionEnv();

  const app = await NestFactory.create(AppModule);

  if (isProduction()) {
    const express = app.getHttpAdapter().getInstance();
    express.set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      hsts: isProduction(),
    }),
  );
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix(API_V1_PREFIX, {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });

  if (isSwaggerEnabled()) {
    const config = new DocumentBuilder()
      .setTitle('App Audit API')
      .setDescription(
        'API de auditoria de segurança — Miasma, supply chain, secrets, dependências e remediação. Base path: /v1',
      )
      .setVersion(APP_VERSION)
      .addBearerAuth()
      .addTag('Authentication')
      .addTag('Security Audit')
      .addTag('Threat Intelligence')
      .addTag('Health')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'App Audit — Swagger',
      swaggerOptions: { persistAuthorization: true },
    });

    if (process.env.EXPORT_OPENAPI === 'true') {
      const out = join(process.cwd(), 'docs', 'openapi.json');
      writeFileSync(out, JSON.stringify(document, null, 2));
      console.log(`OpenAPI exportado em ${out}`);
    }
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`BackEnd rodando em http://localhost:${port}`);
  if (isSwaggerEnabled()) {
    console.log(`Swagger em http://localhost:${port}/api/docs`);
  }
}

bootstrap();
