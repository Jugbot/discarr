import { drizzle, PgliteDatabase } from 'drizzle-orm/pglite'

import * as schema from './schema'

import { config } from './config'

export const db: PgliteDatabase<typeof schema> = drizzle(
  config.POSTGRES_DATA_DIR,
  { schema },
)
