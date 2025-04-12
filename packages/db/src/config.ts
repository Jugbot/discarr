import path from 'path'
import { fileURLToPath } from 'url'
import { config as dotEnvConfig } from 'dotenv'
import { z } from 'zod'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

dotEnvConfig({
  path: path.resolve(dirname, '../.env.development'),
})

const envSchema = z
  .object({
    DATA_DIR: z.string().transform((dir) => path.resolve(dir)),
  })
  .transform((obj) => ({
    ...obj,
    POSTGRES_DATA_DIR: path.resolve(obj.DATA_DIR, 'pgdata'),
  }))

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  const errorMessages = parsedEnv.error.issues
    .map((issue) => `\t${issue.path.join('.')}:\t ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment variables:\n${errorMessages}`)
}

export const config = parsedEnv.data
