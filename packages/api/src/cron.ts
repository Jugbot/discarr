import * as cron from 'node-cron'
import { createTRPCContext } from './trpc'
import { createCaller } from '.'
import config from './config'
import { logger } from './logger'

export function scheduleCron() {
  logger.info('Scheduling cron job')

  let threadLock = false
  const trpc = createCaller(createTRPCContext())
  cron.schedule(
    config.CRON_SCHEDULE,
    () => {
      if (threadLock) {
        logger.info('Skipping cron job, last job still running.')
        return
      }
      threadLock = true
      trpc.post
        .hook()
        .catch((error) => {
          logger.error('Error running cron job:')
          logger.error(error)
        })
        .finally(() => {
          threadLock = false
        })
    },
    {
      runOnInit: true,
    },
  )
}
