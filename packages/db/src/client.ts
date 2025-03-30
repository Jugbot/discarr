import postgres from 'postgres'
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from './schema'
import { connectionUrl } from './config'

const pg = postgres(connectionUrl, {})

export const db: PostgresJsDatabase<typeof schema> = drizzle(pg, { schema })
