import { getUsers } from '../service/user'
import { createTRPCRouter, publicProcedure } from '../trpc'
import { mediaService } from '../service/media'
import { Media } from '@acme/db/schema'
import { and, eq } from '@acme/db'

export const postRouter = createTRPCRouter({
  ping: publicProcedure.query(() => 'pong'),
  sync: publicProcedure.mutation(async ({ ctx }) => {
    const { logger, db } = ctx
    logger.info('Running media sync')

    const { getMedia } = mediaService(ctx)

    const users = await getUsers()
    const medias = await getMedia(users)

    await Promise.all(
      medias.map(async (media) => {
        const mediaLogger = logger.child({
          mediaId: `${media.type}/${media.id}`,
        })
        mediaLogger.verbose(`Syncing ${media.title}`)
        await db
          .update(Media)
          .set({ last_state: media })
          .where(
            and(eq(Media.jellyseerr_id, media.id), eq(Media.type, media.type)),
          )
      }),
    )

    logger.info('Sync complete')
  }),
  hook: publicProcedure.mutation(async ({ ctx }) => {
    const { logger } = ctx
    logger.info('Checking media updates')

    const { getMedia } = mediaService(ctx)

    const users = await getUsers()
    const medias = await getMedia(users)

    logger.info(`Processing ${medias.length} items`)
    if (medias.length > 1000) {
      logger.warn(
        'More than 1000 media items to process, this is above the thread limit of discord. ' +
          'New threads will not be made until inactive threads are archived. ' +
          'Discord should do this automatically after 24 hours.',
      )
    }

    await Promise.all(
      medias.map(async (media) => {
        const mediaLogger = logger.child({
          mediaId: `${media.type}/${media.id}`,
        })
        mediaLogger.verbose(`Processing ${media.title}`)
        const { processMediaUpdate } = mediaService({
          ...ctx,
          logger: mediaLogger,
        })
        return processMediaUpdate(media)
          .catch((error) => {
            mediaLogger.error(error)
          })
          .finally(() => {
            mediaLogger.verbose(`Done`)
          })
      }),
    )

    logger.info('Update check complete')
  }),
})
