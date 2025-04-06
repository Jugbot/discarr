import { getUsers } from '../service/user'
import { createTRPCRouter, publicProcedure } from '../trpc'
import { mediaService } from '../service/media'

export const postRouter = createTRPCRouter({
  ping: publicProcedure.query(() => 'pong'),
  hook: publicProcedure.mutation(async ({ ctx }) => {
    const { logger } = ctx
    logger.info('Running media sync hook')

    const { getMedia } = mediaService(ctx)

    const users = await getUsers()
    const medias = await getMedia(users)

    logger.info(`Processing ${medias.length} items`)
    if (medias.length > 1000) {
      logger.warn(
        'More than 1000 media items to process, this is above the thread limit of discord. New threads will not be made until inactive threads are archived. Discord should do this automatically after 24 hours.',
      )
    }

    await Promise.all(
      medias.map(async (media) => {
        const mediaLogger = logger.child({
          mediaId: media.id,
        })
        mediaLogger.verbose(`Processing ${media.title}`)
        const { processMediaUpdate } = mediaService({
          ...ctx,
          logger: mediaLogger,
        })
        await processMediaUpdate(media).catch((error) => {
          mediaLogger.error(error)
        })
        mediaLogger.verbose(`Done`)
      }),
    )

    logger.info('Media sync hook complete')
  }),
})
