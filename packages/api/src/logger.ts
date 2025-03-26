import winston from 'winston'
import config from './config'

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  transports: [
    new winston.transports.Console({
      format: winston.format.cli({
        colors: {
          error: 'bgRed',
          warn: 'yellow',
          verbose: 'grey',
          info: 'cyan',
          debug: 'green',
        } satisfies Record<typeof config.LOG_LEVEL, string>,
      }),
    }),
  ],
  format: winston.format.errors({ stack: true }),
})
