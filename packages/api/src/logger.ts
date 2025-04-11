import winston from 'winston'
import { config } from './config'

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  transports: [
    new winston.transports.File({
      level: 'debug',
      dirname: 'logs',
      filename: 'latest.log',
      options: { flags: 'w' },
    }),
    new winston.transports.Console({}),
  ],
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format.printf((info) => {
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
