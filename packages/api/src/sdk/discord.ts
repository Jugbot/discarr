import { Client, Events, GatewayIntentBits } from 'discord.js'

import { logger } from '../logger'
import { config } from '../config'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once(Events.ClientReady, (readyClient) => {
  logger.info(`Ready! Logged in as ${readyClient.user.tag}`)
})

client.rest.on('rateLimited', (data) => {
  logger.verbose(
    `Discord API rate limited. Limit: ${data.limit} Timeout: ${(data.retryAfter / 1000).toFixed()}s @ ${data.method}:${data.url}`,
  )
})

client.on('debug', (message) => {
  logger.debug(`[discordjs] ${message}`)
})

client.rest.on('response', (request) => {
  logger.verbose(`[discordjs] ${request.method} ${request.path}`)
})

client.on('warn', (message) => {
  logger.warn(`[discordjs] ${message}`)
})

client.on('error', (error) => {
  logger.error(`[discordjs] ${error}`)
})

let pendingLogin: Promise<Client<boolean>> | null = null

export const getClient = () => {
  if (client.isReady()) {
    return Promise.resolve(client)
  }

  if (pendingLogin) {
    return pendingLogin
  }

  pendingLogin = client
    .login(config.DISCORD_TOKEN)
    .then(() => {
      logger.info('Discord client logged in')
      return client
    })
    .catch((error) => {
      throw new Error('Error logging in to Discord', {
        cause: error,
      })
    })

  return pendingLogin
}
