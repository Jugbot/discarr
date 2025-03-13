import {
  Client,
  Events,
  GatewayIntentBits,
  Guild,
  GuildBasedChannel,
  MessageCreateOptions,
  StartThreadOptions,
} from 'discord.js'

import config from '../config'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

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

export function makeThread(channel: GuildBasedChannel) {
  if (!channel.isTextBased()) {
    throw new Error(`Channel ${channel.id} is not text-based`)
  }
  return (message: MessageCreateOptions, thread: StartThreadOptions) =>
    channel.send(message).then(async (result) => {
      if (!result.thread) {
        await result.startThread(thread)
      }
      return result
    })
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`)
  getServer(readyClient)
    .then(getTextChannel)
    // .then(async (channel) => {
    //   if (!channel.isTextBased()) {
    //     throw new Error(`Channel ${channel.id} is not text-based`)
    //   }
    //   const result = await channel.send('Hello world!')
    //   if (!result.thread) {
    //     return result.startThread({
    //       name: 'test',
    //       reason: 'testing stuff',
    //     })
    //   }
    //   return result.thread
    // })
    // .then((thread) => {
    //   return thread?.send('Hello from thread!')
    // })
    .catch((error) => {
      throw error
    })
})

export const getClient = () => {
  if (client.isReady()) {
    return Promise.resolve(client)
  }

  return client
    .login(config.DISCORD_TOKEN)
    .then(() => {
      console.log('Discord client logged in')
      return client
    })
    .catch((error) => {
      throw new Error('Error logging in to Discord', {
        cause: error,
      })
    })
}
