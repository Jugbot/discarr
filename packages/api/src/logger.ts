import { createLogger, transports, format } from 'winston'
import { config } from './config'

export const logger = createLogger({
  level: config.LOG_LEVEL,
  transports: [
    new transports.File({
      level: 'debug',
      dirname: config.LOG_DIR,
      filename: 'latest.log',
      options: { flags: 'w' },
    }),
    new transports.Console({}),
  ],
  format: format.combine(
    format.errors({ stack: true }),
    format.timestamp(),
    format.printf((info) => {
      const { level, message, timestamp, ...context } = info

      const keys = [
        timestamp,
        level.toUpperCase(),
        ...Object.entries(context).map(([key, value]) => {
          return `${key}=${String(value)}`
        }),
        message,
      ]

      return keys.join('|')
    }),
  ),
})
