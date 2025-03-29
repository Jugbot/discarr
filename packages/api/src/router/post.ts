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

    // TODO: Re-enable parallel processing when contextual logging is added
    for (const media of medias) {
      await processMediaUpdate(ctx)(media)
      logger.verbose(`done processing ${media.title}`)
    }

    logger.info('media sync hook complete')
  }),
})
