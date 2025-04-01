import { eq } from '@acme/db'
import { Media } from '@acme/db/schema'
import { inferRouterContext } from '@trpc/server'
import ansi from 'ansi-escape-sequences'
import {
  AttachmentPayload,
  Message,
  MessageCreateOptions,
  MessageEditOptions,
  PublicThreadChannel,
  ThreadAutoArchiveDuration,
} from 'discord.js'
import { fromMovie, fromSeries } from '../adapter/media'
import { logger } from '../logger'
import { MediaInfo } from '../model/Media'
import { UserMap } from '../model/User'
import { formatANSI, postRouter } from '../router/post'
import { getClient } from '../sdk/discord'
import { client as jellyseerrClient } from '../sdk/jellyseer'
import { client as radarrClient } from '../sdk/radarr'
import { client as sonarrClient } from '../sdk/sonarr'
import { getServer, getTextChannel } from '../service/discord'

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

export async function getMedia(users: UserMap) {
  const sonarrMedia = await sonarrClient
    .GET('/api/v3/series')
    .then(handleBadResponse('Error fetching sonarr series collection'))
  const radarrMedia = await radarrClient
    .GET('/api/v3/movie')
    .then(handleBadResponse('Error fetching radarr movies collection'))

  const tvMediaInfo = await Promise.allSettled(
    sonarrMedia.map((media) =>
      fetchSerie(media.tmdbId).then(fromSeries(users)),
    ),
  )
  const movieMediaInfo = await Promise.allSettled(
    radarrMedia.map((media) => fetchMovie(media.tmdbId).then(fromMovie(users))),
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
        attachment: Buffer.from(colorFromStatus(media.status).base64, 'base64'),
      } satisfies AttachmentPayload,
    ],
  }
}
const upsertThread =
  (ctx: inferRouterContext<typeof postRouter>) =>
  async (media: MediaInfo, thread_id?: string) => {
    const discordClient = await getClient()
    const guild = await getServer(discordClient)
    const channel = await getTextChannel(guild)

    async function deleteBadMessage(message_id: string) {
      logger.debug(`deleting bad message record ${message_id}`)
      await ctx.db.delete(Media).where(eq(Media.thread_id, message_id))
    }

    async function startThread(message: Message<true>) {
      const thread = await message.startThread({
        name: media.title,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      })
      await addRequestersToThread(thread, media)
      return thread
    }

    async function makeNewMessage() {
      logger.info(`creating new message for ${media.title}`)
      const message = await channel.send(mainMessagePayload(media))
      logger.verbose(`created message ${message.id}`)
      await ctx.db.insert(Media).values({
        jellyseerr_id: media.id,
        thread_id: message.id,
        last_state: {
          status: media.status,
        },
      })
      return message
    }

    async function updateMessage(message: Message<true>) {
      await message.edit(mainMessagePayload(media))
      await ctx.db
        .update(Media)
        .set({
          last_state: {
            status: media.status,
          },
        })
        .where(eq(Media.thread_id, message.id))
      return message
    }

    async function fetchExistingThread(thread_id?: string) {
      if (!thread_id) {
        return null
      }
      const message = channel.messages
        .fetch({ message: thread_id, force: true })
        .catch((err) => {
          logger.debug(`Error fetching message: ${err}`)
          return null
        })
      return message
    }

    return await fetchExistingThread(thread_id).then(async (message) => {
      if (!message) {
        if (thread_id) {
          logger.warn(`thread id doesn't match any known message!`)
          await deleteBadMessage(thread_id)
        } else {
          logger.verbose(`no existing message for media`)
        }
        return makeNewMessage().then(startThread)
      }
      await updateMessage(message)
      if (!message.thread) {
        logger.warn(`message doesn't have a thread!`)
        return await startThread(message)
      }

      return message.thread as PublicThreadChannel<false>
    })
  }
function watchCondition(media: MediaInfo) {
  // TODO: Jellyseerr doesn't expose whether the media is being watched in sonarr or radarr
  return (
    !['Unknown', 'Blacklisted'].includes(media.status) ||
    media.requests.length > 0
  )
}
function eventMessagePayload(media: MediaInfo): MessageCreateOptions {
  return {
    content: `\`\`\`ansi\nStatus → ${formatANSI(media.status, [colorFromStatus(media.status).ansi, 'bold'])}\n\`\`\``,
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
export const processMediaUpdate =
  (ctx: inferRouterContext<typeof postRouter>) => async (media: MediaInfo) => {
    logger.verbose(`processing ${media.title}`)
    if (!watchCondition(media)) {
      logger.verbose(`skipping ${media.title}`)
      return
    }

    const threadRow = await ctx.db.query.Media.findFirst({
      where: eq(Media.jellyseerr_id, media.id),
    })

    // Update or create message with thread
    const thread = await upsertThread(ctx)(media, threadRow?.thread_id)

    // Skip faux events if thread is new
    if (!threadRow?.last_state) {
      return
    }

    logger.verbose(`processing changes for ${media.title}`)

    const lastState = threadRow.last_state

    // Skip if field hasn't been set, which means it's from an old version of the app
    const isMigrated = (val: unknown) => val !== undefined

    if (isMigrated(lastState.status) && lastState.status !== media.status) {
      await thread.send(eventMessagePayload(media))
    }
  }
