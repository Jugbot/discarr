import { Client, Events, GatewayIntentBits } from 'discord.js'

import { logger } from '../logger'
import { config } from '../config'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once(Events.ClientReady, (readyClient) => {
  logger.info(`Ready! Logged in as ${readyClient.user.tag}`)
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
