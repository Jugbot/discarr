import ansi from 'ansi-escape-sequences'
import { getUsers } from '../service/user'
import { createTRPCRouter, publicProcedure } from '../trpc'
import { logger } from '../logger'
import { getMedia, processMediaUpdate } from '../service/media'

export const formatANSI = ansi.format

export const postRouter = createTRPCRouter({
  ping: publicProcedure.query(() => 'pong'),
  hook: publicProcedure.mutation(async ({ ctx }) => {
    logger.info('running media sync hook')
    const users = await getUsers()
    const medias = await getMedia(users)

    if (medias.length > 1000) {
      logger.warn(
        'More than 1000 media items to process, this is above the thread limit of discord. New threads will not be made until inactive threads are archived. Discord should do this automatically after 24 hours.',
      )
    }

    // TODO: Re-enable parallel processing when contextual logging is added
    for (const media of medias) {
      await processMediaUpdate(ctx)(media)
      logger.verbose(`done processing ${media.title}`)
    }

    logger.info('media sync hook complete')
  }),
})
