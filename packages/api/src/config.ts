import { config as dotEnvConfig } from 'dotenv'
import { z } from 'zod'
import { validate } from 'node-cron'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const envPaths: Record<string, string[]> = {
  development: ['.env.local', '.env.development'],
  test: ['.env.test'],
  production: ['.env.production'],
}

dotEnvConfig({
  path: envPaths[process.env.NODE_ENV ?? 'development']?.map((filename) =>
    path.resolve(dirname, '..', filename),
  ),
})

const envSchema = z
  .object({
    DISCORD_TOKEN: z.string().min(1),
    DISCORD_GUILD_ID: z.string().min(1),
    DISCORD_CHANNEL_ID: z.string().min(1),
    JELLYSEER_URL: z
      .string()
      .url()
      .refine((url) => !url.endsWith('/'), {
        message: "URL should not end with '/'",
      }),
    JELLYSEER_PUBLIC_URL: z
      .string()
      .url()
      .optional()
      .refine((url) => !url?.endsWith('/'), {
        message: "URL should not end with '/'",
      }),
    JELLYSEER_API_KEY: z.string().min(1),
    SONARR_URL: z
      .string()
      .url()
      .optional()
      .refine((url) => !url?.endsWith('/'), {
        message: "URL should not end with '/'",
      }),
    SONARR_API_KEY: z.string().min(1).optional(),
    RADARR_URL: z
      .string()
      .url()
      .optional()
      .refine((url) => !url?.endsWith('/'), {
        message: "URL should not end with '/'",
      }),
    RADARR_API_KEY: z.string().min(1).optional(),
    CRON_SCHEDULE: z
      .string()
      .default('* * * * *')
      .refine(validate, (invalid) => ({
        message: `Invalid cron schedule: "${invalid}"`,
      })),
    LOG_LEVEL: z
      .enum(['error', 'warn', 'info', 'verbose', 'debug'])
      .default('info'),
    DATA_DIR: z.string().transform((dir) => path.resolve(dir)),
    SKIP_STARTUP_DATA_SYNC: z
      .enum(['0', '1', 'false', 'true'])
      .default('false')
      .transform((value) => ['1', 'true'].includes(value)),
  })
  .transform((obj) => ({
    ...obj,
    JELLYSEER_PUBLIC_URL: obj.JELLYSEER_PUBLIC_URL ?? obj.JELLYSEER_URL,
    LOG_DIR: path.resolve(obj.DATA_DIR, 'logs'),
  }))

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  const errorMessages = parsedEnv.error.issues
    .map((issue) => `\t${issue.path.join('.')}:\t ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment variables:\n${errorMessages}`)
}

export const config = parsedEnv.data
