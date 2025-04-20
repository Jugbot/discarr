import { createHTTPServer } from '@trpc/server/adapters/standalone'
import cors from 'cors'
import { appRouter } from './root'
import { createTRPCContext } from './trpc'
import { scheduleCron } from './cron'
import { config } from './config'
import { createCaller } from './index'
import { logger } from './logger'

if (!config.SKIP_STARTUP_DATA_SYNC) {
  const trpc = createCaller(createTRPCContext())
  await trpc.post.sync().catch((error) => {
    logger.error('Error running startup data sync:')
    logger.error(error)
  })
}

scheduleCron()

const server = createHTTPServer({
  router: appRouter,
  createContext: createTRPCContext,
  middleware: cors(),
})

server.listen(3000)
