import type { Config } from 'drizzle-kit'
import { connectionUrl } from './src/config'

export default {
  schema: './src/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: connectionUrl },
} satisfies Config
