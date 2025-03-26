import { createHTTPServer } from '@trpc/server/adapters/standalone'
import cors from 'cors'
import { appRouter } from './root'
import { createTRPCContext } from './trpc'
import { scheduleCron } from './cron'

scheduleCron()

const server = createHTTPServer({
  router: appRouter,
  createContext: createTRPCContext,
  middleware: cors(),
})

server.listen(3000)
