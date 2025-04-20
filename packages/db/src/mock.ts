import { drizzle } from 'drizzle-orm/pglite'

import * as schema from './schema'

export const mockDB = drizzle.mock({
  schema,
})
