import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let client: postgres.Sql | undefined
let database: ReturnType<typeof drizzle<typeof schema>> | undefined

function getDatabase() {
  if (database) {
    return database
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL 환경변수가 없습니다.')
  }

  client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    prepare: false,
  })

  database = drizzle(client, { schema })
  return database
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDatabase() as object, prop, receiver)
  },
})

export type Database = typeof db
