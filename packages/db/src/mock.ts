import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

export const mockDB: PostgresJsDatabase<typeof schema> = drizzle.mock({
  schema,
})
