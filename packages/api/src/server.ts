import { createHTTPServer } from '@trpc/server/adapters/standalone'
import { appRouter } from './root'
import { createTRPCContext } from './trpc'
import cors from 'cors'

const server = createHTTPServer({
  router: appRouter,
  createContext: createTRPCContext,
  middleware: cors(),
})

server.listen(3000)
