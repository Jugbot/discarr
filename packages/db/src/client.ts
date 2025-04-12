import { drizzle } from 'drizzle-orm/pglite'

import * as schema from './schema'

import { config } from './config'

export const db = drizzle(config.POSTGRES_DATA_DIR, { schema })
