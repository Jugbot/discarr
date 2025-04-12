import type { Config } from 'drizzle-kit'
import { config } from './src/config'

export default {
  schema: './src/schema.ts',
  dialect: 'postgresql',
  driver: 'pglite',
  dbCredentials: {
    url: config.POSTGRES_DATA_DIR,
  },
} satisfies Config
