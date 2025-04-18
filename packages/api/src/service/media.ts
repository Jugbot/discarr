import { eq, and } from '@acme/db'
import { Media } from '@acme/db/schema'
import { DeepPartial, inferRouterContext } from '@trpc/server'
import ansi from 'ansi-escape-sequences'
import {
  AttachmentPayload,
  DiscordAPIError,
  Message,
  MessageCreateOptions,
  MessageEditOptions,
  PublicThreadChannel,
  RESTJSONErrorCodes,
  ThreadAutoArchiveDuration,
} from 'discord.js'
import { fromMovie, fromSeries } from '../adapter/media'
import { Episode, MediaInfo, Season } from '../model/Media'
import { UserMap } from '../model/User'
import { postRouter } from '../router/post'
import { getClient } from '../sdk/discord'
import { client as jellyseerrClient } from '../sdk/jellyseer'
import { client as radarrClient } from '../sdk/radarr'
import { client as sonarrClient } from '../sdk/sonarr'
import { getServer, getTextChannel } from '../service/discord'
import { deepEquals } from '../utilities/deepEquals'

export function mediaService({
  logger,
  db,
}: inferRouterContext<typeof postRouter>) {
  const handleBadResponse =
    (errorMessage: string) =>
    <T>(res: { data?: T; response: Response; error?: unknown }) => {
      if (!res.data) {
        return Promise.reject(
          Error(errorMessage, {
            cause: res.error,
          }),
        )
      }
      return Promise.resolve(res.data)
    }

  const fetchSerie = (tmdbId: number) =>
    jellyseerrClient
      .GET('/tv/{tvId}', {
        params: {
          path: {
            tvId: tmdbId,
          },
        },
      })
      .then(handleBadResponse('Error fetching jellyseerr series'))

  const fetchSerieEpisodes = (seriesId: number) =>
    sonarrClient
      .GET('/api/v3/episode', {
        params: {
          query: {
            seriesId: seriesId,
            includeEpisodeFile: true,
          },
        },
      })
      .then(handleBadResponse('Error fetching sonarr episodes'))

  const fetchMovie = (tmdbId: number) =>
    jellyseerrClient
      .GET('/movie/{movieId}', {
        params: {
          path: {
            movieId: tmdbId,
          },
        },
      })
      .then(handleBadResponse('Error fetching jellyseerr movie'))

  async function getMedia(users: UserMap) {
    const sonarrMedia = await sonarrClient
      .GET('/api/v3/series')
      .then(handleBadResponse('Error fetching sonarr series collection'))
    const radarrMedia = await radarrClient
      .GET('/api/v3/movie')
      .then(handleBadResponse('Error fetching radarr movies collection'))

    const tvMediaInfo = await Promise.allSettled(
      sonarrMedia.map((media) =>
        fetchSerie(media.tmdbId)
          .then(async (serie) => ({
            ...serie,
            episodes: await fetchSerieEpisodes(serie.id),
          }))
          .then(fromSeries(users)),
      ),
    )
    const movieMediaInfo = await Promise.allSettled(
      radarrMedia.map((media) =>
        fetchMovie(media.tmdbId).then(fromMovie(users)),
      ),
    )

    const [resolved, rejected] = [...tvMediaInfo, ...movieMediaInfo].reduce(
      (acc, next) => {
        if (next.status === 'fulfilled') {
          acc[0].push(next.value)
        } else {
          acc[1].push(next.reason)
        }
        return acc
      },
      [[], []] as [MediaInfo[], unknown[]],
    )

    for (const error of rejected) {
      logger.error(error)
    }

    return resolved
  }

  type StatusMeta = {
    /** hex rgb number */
    color: number
    /** png image 1x1 pixel */
    base64: string
    ansi: keyof typeof ansi.style
  }

  function colorFromStatus(status: MediaInfo['status']): StatusMeta {
    switch (status) {
      case 'Available':
        return {
          color: 0x2ecc71,
          base64:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdj0DtT+B8ABQICa3znZ2oAAAAASUVORK5CYII=',
          ansi: 'green',
        }
      case 'Blacklisted':
        return {
          color: 0xe74c3c,
          base64:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjeO5j8x8ABfwCb6cFtH0AAAAASUVORK5CYII=',
          ansi: 'red',
        }
      case 'Pending':
        return {
          color: 0xe67e22,
          base64:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjeFan9B8ABloChnlkdVsAAAAASUVORK5CYII=',
          ansi: 'yellow',
        }
      case 'Processing':
        return {
          color: 0x3498db,
          base64:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjMJlx+z8ABVICp/IuGtoAAAAASUVORK5CYII=',
          ansi: 'blue',
        }
      default:
        return {
          color: 0x95a5a6,
          base64:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjmLp02X8ABpMC4IYnRY4AAAAASUVORK5CYII=',
          ansi: 'white',
        }
    }
  }

  function mainMessagePayload(
    media: MediaInfo,
  ): MessageCreateOptions & MessageEditOptions {
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
  }

  const upsertMessage = async (media: MediaInfo, message_id?: string) => {
    const discordClient = await getClient()
    const guild = await getServer(discordClient)
    const channel = await getTextChannel(guild)

    async function deleteBadMessage(message_id: string) {
      logger.debug(`Deleting bad message record ${message_id}`)
      await db.delete(Media).where(eq(Media.thread_id, message_id))
    }

    async function makeNewMessage() {
      logger.info(`Creating new discord message`)
      const message = await channel.send(mainMessagePayload(media))
      logger.info(`Created message ${message.id}`)
      await db.insert(Media).values({
        jellyseerr_id: media.id,
        type: media.type,
        thread_id: message.id,
        last_state: media,
      })
      return message
    }

    async function updateMessage(message: Message<true>) {
      logger.info(`Updating existing message ${message.id}`)
      await message.edit(mainMessagePayload(media))
      await db
        .update(Media)
        .set({
          last_state: media,
        })
        .where(eq(Media.thread_id, message.id))
      return message
    }

    async function fetchExistingMessage(message_id?: string) {
      if (!message_id) {
        return null
      }
      const message = channel.messages
        .fetch({ message: message_id, force: true })
        .catch((err) => {
          if (
            err instanceof DiscordAPIError &&
            err.code === RESTJSONErrorCodes.UnknownMessage
          ) {
            logger.debug(`Message with id ${message_id} not found.`)
            return null
          }
          logger.debug(`Error fetching message: ${err}`)
          throw err
        })
      return message
    }

    return await fetchExistingMessage(message_id).then(async (message) => {
      if (!message) {
        if (message_id) {
          logger.warn(`Thread id doesn't match any known message!`)
          await deleteBadMessage(message_id)
        } else {
          logger.verbose(`No existing message for media`)
        }
        return makeNewMessage()
      }
      return await updateMessage(message)
    })
  }

  function mediaStatusMessagePayload(media: MediaInfo): MessageCreateOptions {
    return {
      content: `\`\`\`ansi\nStatus → ${ansi.format(media.status, [colorFromStatus(media.status).ansi, 'bold'])}\n\`\`\``,
    }
  }

  function episodeStatusMessagePayload(episode: Episode): MessageCreateOptions {
    return {
      content: `\`\`\`ansi\nEpisode S${episode.seasonNumber}E${episode.number} → ${ansi.format(
        episode.available ? 'Available' : 'Unavailable',
        [episode.available ? 'green' : 'red', 'bold'],
      )}\n\`\`\``,
    }
  }

  function seasonStatusMessagePayload(season: Season): MessageCreateOptions {
    return {
      content: `\`\`\`ansi\nSeason ${season.number} → ${ansi.format(
        season.available ? 'Available' : 'Unavailable',
        [season.available ? 'green' : 'red', 'bold'],
      )}\n\`\`\``,
    }
  }

  function addRequestersToThread(
    thread: PublicThreadChannel<false>,
    media: MediaInfo,
  ) {
    return Promise.allSettled(
      media.requests
        .map((r) => r.user.discordId)
        .filter((s): s is string => !!s)
        .map((s) => thread.members.add(s)),
    ).then((results) => {
      results
        .filter((r) => r.status === 'rejected')
        .forEach((e) => {
          logger.warn(`Failed to add member to thread: ${e.reason}`)
        })
      return results
    })
  }

  async function startThread(message: Message<true>, media: MediaInfo) {
    const thread = await message.startThread({
      name: media.title,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
    })
    await addRequestersToThread(thread, media)
    return thread
  }

  const processMediaUpdate = async (media: MediaInfo) => {
    const threadRow = await db.query.Media.findFirst({
      where: and(eq(Media.jellyseerr_id, media.id), eq(Media.type, media.type)),
    })

    if (threadRow && deepEquals(threadRow.last_state, media)) {
      logger.verbose(`No changes to media, skipping`)
      return
    }

    // Update or create message
    const message = await upsertMessage(media, threadRow?.thread_id)

    // Skip faux events if thread is new
    if (!threadRow) {
      return
    }

    // Last state can potentially have missing keys
    const lastState = threadRow.last_state as DeepPartial<MediaInfo>

    // Get or create thread
    const getThread = async () => {
      if (!message.thread) {
        return startThread(message, media)
      }
      return message.thread
    }

    if (lastState.status !== media.status) {
      logger.info(`Sending status update: media status`)
      const thread = await getThread()
      await thread.send(mediaStatusMessagePayload(media))
    }

    for (const season of Object.values(media.seasons ?? {})) {
      const lastSeason = lastState.seasons?.[season.number]
      if (season.available) {
        if (!lastSeason?.available) {
          logger.info(`Sending status update: new season`)
          const thread = await getThread()
          await thread.send(seasonStatusMessagePayload(season))
        }
        continue
      }
      for (const episode of Object.values(season.episodes)) {
        const lastEpisode = lastSeason?.episodes?.[episode.number]
        if (episode.available && !lastEpisode?.available) {
          logger.info(`Sending status update: new episode`)
          const thread = await getThread()
          await thread.send(episodeStatusMessagePayload(episode))
        }
      }
    }
  }

  return {
    processMediaUpdate,
    getMedia,
  }
}
