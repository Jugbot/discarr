import { config } from 'dotenv'
import { z } from 'zod'

const result = config({
  path: ['.env.local', '.env.development'],
})

if (result.error) {
  throw result.error
}

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  DISCORD_CHANNEL_ID: z.string().min(1),
  JELLYSEER_URL: z
    .string()
    .url()
    .refine((url) => !url.endsWith('/'), {
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
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  throw new Error(`Environment validation error: ${parsedEnv.error.message}`)
}

export default parsedEnv.data
