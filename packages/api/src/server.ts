import { createHTTPServer } from '@trpc/server/adapters/standalone'
import cors from 'cors'
import { createCaller } from '.'
import { appRouter } from './root'
import { createTRPCContext } from './trpc'

import * as cron from 'node-cron'

console.log('Running a task every minute')

let threadLock = false
cron.schedule(
  '* * * * *',
  () => {
    if (threadLock) {
      console.log('Skipping cron job, last job still running.')
      return
    }
    threadLock = true
    const trpc = createCaller(createTRPCContext())
    trpc.post
      .hook()
      .catch((error) => {
        console.error('Error running cron job:')
        console.error(error)
      })
      .finally(() => {
        threadLock = false
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
