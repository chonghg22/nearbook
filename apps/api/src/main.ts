import { existsSync } from 'fs'
import { resolve } from 'path'
import { config as loadEnv } from 'dotenv'

// dotenv를 모든 모듈 import 전에 로드해야 @nearbook/db가 DATABASE_URL을 읽을 수 있음
for (const envFile of ['.env.local', '.env']) {
  const envPath = resolve(process.cwd(), envFile)
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false })
  }
}

import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? [
      'http://localhost:3000',
      'https://near-book.com',
      'https://www.near-book.com',
    ],
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  )

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('우리동네책 API')
      .setDescription('전국 공공도서관 책 검색 API')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config))
  }

  const port = process.env.PORT ?? 3001
  await app.listen(port)
  console.log(`🚀 API: http://localhost:${port}`)
  console.log(`📖 Swagger: http://localhost:${port}/docs`)
}

bootstrap()
