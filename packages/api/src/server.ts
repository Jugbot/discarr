import { createHTTPServer } from '@trpc/server/adapters/standalone'
import cors from 'cors'
import { createCaller } from '.'
import { appRouter } from './root'
import { createTRPCContext } from './trpc'

import * as cron from 'node-cron'

console.log('Running a task every minute')
cron.schedule(
  '* * * * *',
  () => {
    const trpc = createCaller(createTRPCContext())
    void trpc.post.hook().catch((error) => {
      console.error('Error running cron job:')
      console.error(error)
    })
  },
  {
    runOnInit: true,
  },
)

const server = createHTTPServer({
  router: appRouter,
  createContext: createTRPCContext,
  middleware: cors(),
})

server.listen(3000)
