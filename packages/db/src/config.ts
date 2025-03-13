import path from 'path'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

config({
  path: path.resolve(dirname, '../.env.development'),
})

if (!process.env.POSTGRES_URL) {
  throw new Error('Missing POSTGRES_URL')
}

export const connectionUrl = process.env.POSTGRES_URL
