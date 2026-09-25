import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';

import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Static Assets (Now handled by ServeStaticModule in AppModule)
  // app.useStaticAssets(join(process.cwd(), 'storage'));

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS: comma-separated origins in CORS_ORIGIN, or any origin when unset
  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: corsOrigin?.length ? corsOrigin : true });

  // Swagger (not exposed in production)
  if (process.env.NODE_ENV !== 'production') {
  const config = new DocumentBuilder()
    .setTitle('Screen API')
    .setDescription('The Screen Management API')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 4006;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📖 Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
