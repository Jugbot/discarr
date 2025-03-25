import { config } from 'dotenv'
import { z } from 'zod'

config({
  path: ['.env.local', '.env.development'],
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
  })
  .transform((obj) => ({
    ...obj,
    JELLYSEER_PUBLIC_URL: obj.JELLYSEER_PUBLIC_URL ?? obj.JELLYSEER_URL,
  }))

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  const errorMessages = parsedEnv.error.issues
    .map((issue) => `\t${issue.path.join('.')}:\t ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment variables:\n${errorMessages}`)
}

export default parsedEnv
