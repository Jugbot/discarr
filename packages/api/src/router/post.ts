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
} from 'discord.js'
import {
  getClient,
  getServer,
  getTextChannel,
  makeThread,
} from '../api/discord'
import { client as jellyseerrClient } from '../api/jellyseer'
import { components } from '../generated/overseerrAPI'
import { fromMovie, fromSeries, MediaInfo } from '../model/Media'
import { getUsers, UserMap } from '../model/User'
import { createTRPCRouter, publicProcedure } from '../trpc'

const formatANSI = ansi.format

export const postRouter = createTRPCRouter({
  ping: publicProcedure.query(() => 'pong'),
  hook: publicProcedure.mutation(async ({ ctx }) => {
    console.log('running media sync hook')
    const users = await getUsers()
    const medias = await getMedia(users)

    await Promise.all(
      medias.map((media) => media.then(processMediaUpdate(ctx))),
    )
    console.log('media sync hook complete')
  }),
})

async function getMedia(users: UserMap) {
  const result = await jellyseerrClient.GET('/media', {
    params: {
      query: {
        take: 9999,
      },
    },
  })

  if (!result.data) {
    throw new Error(`Error fetching media: ${result.response.statusText}`)
  }

  return result.data.results.map(getDetails(users))
}

const getDetails =
  (users: UserMap) => (media: components['schemas']['MediaInfo']) => {
    const handleBadResponse = <T>(res: {
      data?: T
      response: Response
      error?: unknown
    }) => {
      if (!res.data) {
        return Promise.reject(
          Error(`Error fetching media details: ${res.response.status}`, {
            cause: res.error,
          }),
        )
      }
      return res.data
    }

    if (media.mediaType === 'movie') {
      return jellyseerrClient
        .GET('/movie/{movieId}', {
          params: {
            path: {
              movieId: media.tmdbId,
            },
          },
        })
        .then(handleBadResponse)
        .then(fromMovie(users))
    }
    return jellyseerrClient
      .GET('/tv/{tvId}', {
        params: {
          path: {
            tvId: media.tmdbId,
          },
        },
      })
      .then(handleBadResponse)
      .then(fromSeries(users))
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
    case 'Partially Available':
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
  const requests = `*Requested by* ${media.requests
    .map((r) => (r.user.discordId ? `<@${r.user.discordId}>` : r.user.name))
    .join(' ')}`
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
        fields: [
          {
            name: '',
            value: requests,
            inline: true,
          },
        ],
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

    async function deleteBadThread(thread_id: string) {
      await ctx.db.delete(Media).where(eq(Media.thread_id, thread_id))
    }

    async function makeNewThread() {
      const newThread = await makeThread(channel)(mainMessagePayload(media), {
        name: media.title,
      })
      await ctx.db.insert(Media).values({
        jellyseerr_id: media.id,
        thread_id: newThread.id,
        last_state: {
          status: media.status,
        },
      })
      return newThread
    }

    async function updateThreadMessage(message: Message<true>) {
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
      const handleBadThread = async (thread_id: string) => {
        await deleteBadThread(thread_id)
        return null
      }
      const message = channel.messages
        .fetch(thread_id)
        .then((r) => {
          if (!r.hasThread) {
            return handleBadThread(thread_id)
          }
          return r
        })
        .catch(() => {
          return handleBadThread(thread_id)
        })
      return message
    }

    return await fetchExistingThread(thread_id).then(async (thread) => {
      if (!thread || !thread.thread) {
        console.log(`thread not found for ${media.title}, creating new thread`)
        return makeNewThread()
      } else {
        await updateThreadMessage(thread)
      }
      return thread.thread as PublicThreadChannel<false>
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
    content: `\`\`\`ansi\nStatus 🡆 ${formatANSI(media.status, [colorFromStatus(media.status).ansi, 'bold'])}\n\`\`\``,
  }
}

const processMediaUpdate =
  (ctx: inferRouterContext<typeof postRouter>) => async (media: MediaInfo) => {
    if (!watchCondition(media)) {
      return
    }

    const threadRow = await ctx.db.query.Media.findFirst({
      where: eq(Media.jellyseerr_id, media.id),
    })

    // Update or create thread
    const thread = await upsertThread(ctx)(media, threadRow?.thread_id)

    // Skip faux events if thread is new
    if (!threadRow?.last_state) {
      return
    }

    const lastState = threadRow.last_state

    // Skip if field hasn't been set, which means it's from an old version of the app
    const isMigrated = (val: unknown) => val !== undefined

    if (isMigrated(lastState.status) && lastState.status !== media.status) {
      await thread.send(eventMessagePayload(media))
    }
  }
