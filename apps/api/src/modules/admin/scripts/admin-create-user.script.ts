import { existsSync } from 'fs'
import { resolve } from 'path'
import { config as loadEnv } from 'dotenv'

for (const envFile of ['.env.local', '.env']) {
  const envPath = resolve(process.cwd(), envFile)
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false })
  }
}

import { NestFactory } from '@nestjs/core'
import { AppModule } from '../../../app.module'
import { AdminAuthService } from '../services/admin-auth.service'

async function bootstrap() {
  const email = process.argv[2]
  const password = process.argv[3]
  const role = process.argv[4] ?? 'super_admin'

  if (!email || !password) {
    console.error('Usage: pnpm --filter @nearbook/api admin:create-user <email> <password> [role]')
    process.exit(1)
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
  const service = app.get(AdminAuthService)
  const adminUser = await service.upsertAdminUser(email, password, role)
  console.log(`Admin user ready: ${adminUser.email} (${adminUser.role})`)
  await app.close()
}

bootstrap().catch((error) => {
  console.error(error)
  process.exit(1)
})
