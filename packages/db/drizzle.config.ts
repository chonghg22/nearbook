import 'dotenv/config'
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/schema.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ['nearbook'],   // ← 추가
  verbose: true,
  strict: true,
} satisfies Config
