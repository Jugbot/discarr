import {
  Client,
  Guild
} from 'discord.js'

import { config } from '../config'

export function getServer(readyClient: Client) {
  return readyClient.guilds.fetch(config.DISCORD_GUILD_ID).catch((error) => {
    throw new Error(`DISCORD_GUILD_ID ${config.DISCORD_GUILD_ID} not found`, {
      cause: error,
    })
  })
}

export function getTextChannel(server: Guild) {
  return server.channels
    .fetch(config.DISCORD_CHANNEL_ID)
    .then((channel) => {
      if (!channel) {
        throw new Error(
          `DISCORD_CHANNEL_ID ${config.DISCORD_CHANNEL_ID} not found`,
        )
      }
      if (!channel.isTextBased()) {
        throw new Error(`Channel ${channel.id} is not a text channel`)
      }
      return channel
    })
    .catch((error) => {
      throw new Error(`Error fetching channel`, {
        cause: error,
      })
    })
}
