import 'dotenv/config'
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/schema.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  schemaFilter: ['nearbook'],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config