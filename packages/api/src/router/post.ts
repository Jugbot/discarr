import { eq } from '@acme/db'
import { Media } from '@acme/db/schema'
import { inferRouterContext } from '@trpc/server'
import { BaseMessageOptions } from 'discord.js'
import {
  getClient,
  getServer,
  getTextChannel,
  makeThread,
} from '../api/discord'
import { client as jellyseerrClient } from '../api/jellyseer'
import { components } from '../generated/overseerrAPI'
import { fromMovie, fromSeries, MediaInfo } from '../model/Media'
import { createTRPCRouter, publicProcedure } from '../trpc'

export const postRouter = createTRPCRouter({
  hook: publicProcedure.mutation(async ({ ctx }) => {
    console.log('running media sync hook')
    const result = await jellyseerrClient.GET('/media', {
      params: {
        query: {
          take: 99999,
        },
      },
    })

    if (!result.data) {
      throw new Error(`Error fetching media: ${result.response.statusText}`)
    }

    await Promise.all(
      result.data.results.map(async (media) => {
        const mediaDetails = await getDetails(media)
        console.log(`processing media ${mediaDetails.title}`)
        await processMediaUpdate(ctx)(mediaDetails)
      }),
    )
    console.log('media sync hook complete')
  }),
})

function getDetails(media: components['schemas']['MediaInfo']) {
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
      .then(fromMovie(media))
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
    .then(fromSeries(media))
}

function discordMessagePayload(media: MediaInfo): BaseMessageOptions {
  function getLinks() {
    if (media.type === 'movie') {
      return [`[${media.title}](${media.link})`]
    }
    return media.episodes.map(
      (episode) => `[S${episode.season}E${episode.episode}](${media.link})`,
    )
  }
  function colorFromStatus(status: MediaInfo['status']) {
    switch (status) {
      case 'Partially Available':
      case 'Available':
        return 3066993
      case 'Blacklisted':
        return 15158332
      case 'Pending':
        return 15105570
      case 'Processing':
        return 3447003
      default:
        return undefined
    }
  }

  const links = getLinks()

  return {
    embeds: [
      {
        title: media.title,
        description: `${media.overview}\n${links.join(' ')}`,
        thumbnail: {
          url: media.image,
        },
        color: colorFromStatus(media.status),
        fields: [
          {
            name: 'Download Status',
            value: `${media.downloadStatus.completion * 100}%`,
            inline: true,
          },
          {
            name: 'touched',
            value: new Date().toISOString(),
          },
          {
            name: 'status',
            value: media.status,
          },
        ],
      },
    ],
  }
}

// TODO: Update existing message
const upsertThread =
  (ctx: inferRouterContext<typeof postRouter>) => async (media: MediaInfo) => {
    const discordClient = await getClient()
    const guild = await getServer(discordClient)
    const channel = await getTextChannel(guild)

    const threadRow = await ctx.db.query.Media.findFirst({
      where: eq(Media.jellyseerr_id, media.id),
    })

    async function fetchThreadStarterMessage(thread_id?: string) {
      if (!thread_id) {
        return null
      }
      const handleBadThread = async (thread_id: string) => {
        await ctx.db.delete(Media).where(eq(Media.thread_id, thread_id))
        return null
      }
      const message = channel.messages
        .fetch(thread_id)
        .then((r) => {
          if (!r) {
            return handleBadThread(thread_id)
          }
          return r
        })
        .catch(() => {
          return handleBadThread(thread_id)
        })
      return message
    }

    async function makeNewThread() {
      const newThread = await makeThread(channel)(
        discordMessagePayload(media),
        {
          name: media.title,
        },
      )
      await ctx.db.insert(Media).values({
        jellyseerr_id: media.id,
        thread_id: newThread.id,
      })
      return newThread
    }

    return await fetchThreadStarterMessage(threadRow?.thread_id).then(
      async (thread) => {
        if (!thread) {
          console.log(
            `thread not found for ${media.title}, creating new thread`,
          )
          return makeNewThread()
        }
        return thread
      },
    )
  }

const processMediaUpdate =
  (ctx: inferRouterContext<typeof postRouter>) =>
  async (extraInfo: MediaInfo) => {
    await upsertThread(ctx)(extraInfo)

    // TODO: trigger faux-events
  }
