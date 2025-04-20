import {
  AttachmentPayload,
  BaseMessageOptions,
  Client,
  Guild,
  MessageCreateOptions,
} from 'discord.js'
import { Episode, MediaInfo, Season } from '../model/Media'

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

type StatusMeta = {
  /** hex rgb number */
  color: number
  /** png image 1x1 pixel */
  base64: string
}

function colorFromStatus(status: MediaInfo['status']): StatusMeta {
  switch (status) {
    case 'Available':
      return {
        color: 0x2ecc71,
        base64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdj0DtT+B8ABQICa3znZ2oAAAAASUVORK5CYII=',
      }
    case 'Blacklisted':
      return {
        color: 0xe74c3c,
        base64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjeO5j8x8ABfwCb6cFtH0AAAAASUVORK5CYII=',
      }
    case 'Pending':
      return {
        color: 0xe67e22,
        base64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjeFan9B8ABloChnlkdVsAAAAASUVORK5CYII=',
      }
    case 'Processing':
      return {
        color: 0x3498db,
        base64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjMJlx+z8ABVICp/IuGtoAAAAASUVORK5CYII=',
      }
    default:
      return {
        color: 0x95a5a6,
        base64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjmLp02X8ABpMC4IYnRY4AAAAASUVORK5CYII=',
      }
  }
}

function statusMessageTemplate(
  status: MediaInfo['status'],
  text: string,
): MessageCreateOptions {
  return {
    embeds: [
      {
        title: text,
        color: colorFromStatus(status).color,
      },
    ],
  }
}

export const templates = {
  mediaStatus: function (media: MediaInfo): BaseMessageOptions {
    return statusMessageTemplate(media.status, `Status → ${media.status}`)
  },

  episodeStatus: function (episode: Episode): BaseMessageOptions {
    return statusMessageTemplate(
      episode.available ? 'Available' : 'Unknown',
      `Episode S${episode.seasonNumber}E${episode.number} → ${
        episode.available ? 'Available' : 'Unavailable'
      }`,
    )
  },

  seasonStatus: function (season: Season): BaseMessageOptions {
    return statusMessageTemplate(
      season.available ? 'Available' : 'Unknown',
      `Season ${season.number} → ${
        season.available ? 'Available' : 'Unavailable'
      }`,
    )
  },

  mainMessage: function (media: MediaInfo): BaseMessageOptions {
    const requests = media.requests
      .map((r) => (r.user.discordId ? `<@${r.user.discordId}>` : r.user.name))
      .join(' ')
    const statusText =
      media.status === 'Processing'
        ? `Processing — ${(media.downloadStatus.completion * 100).toFixed()}%`
        : media.status

    return {
      embeds: [
        {
          title: media.title,
          url: media.link,
          description: media.overview,
          thumbnail: {
            url: media.image,
          },
          color: colorFromStatus(media.status).color,
          fields: requests
            ? [
                {
                  name: '',
                  value: `*Requested by* ${requests}`,
                  inline: true,
                },
              ]
            : undefined,
          footer: {
            text: statusText,
            icon_url: 'attachment://status',
          },
        },
      ],
      files: [
        {
          name: 'status',
          attachment: Buffer.from(
            colorFromStatus(media.status).base64,
            'base64',
          ),
        } satisfies AttachmentPayload,
      ],
    }
  },
}
