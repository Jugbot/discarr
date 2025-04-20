import { config } from '../config'
import { components as jellyseerrComponents } from '../generated/overseerrAPI'
import { components as sonarrComponents } from '../generated/sonarrAPI'
import { MediaInfo, Request, Season } from '../model/Media'
import { UserMap } from '../model/User'

const imageUrlFromPath = (path: string) =>
  `https://image.tmdb.org/t/p/w600_and_h900_bestv2/${path}`

const statusTextFromCode = (code: number) => {
  switch (code) {
    case 2:
      return 'Pending'
    case 3:
      return 'Processing'
    case 4:
      // Partially available
      return 'Available'
    case 5:
      return 'Available'
    case 6:
      return 'Blacklisted'
    default:
      return 'Unknown'
  }
}

const downloadStatusSummary = (
  downloads: jellyseerrComponents['schemas']['DownloadingItem'][],
) => {
  const totalCompletionFraction = downloads.reduce(
    (acc, status) => ({
      numerator: acc.numerator + status.size - status.sizeLeft,
      denominator: acc.denominator + status.size,
    }),
    { numerator: 0, denominator: 0 },
  )

  return {
    downloadStatus: {
      completion: totalCompletionFraction.denominator
        ? totalCompletionFraction.numerator /
          totalCompletionFraction.denominator
        : 0,
    },
  }
}

const fromEpisodes = (
  episodes: sonarrComponents['schemas']['EpisodeResource'][],
) =>
  episodes.reduce<Record<number, Season>>((acc, episode) => {
    const season = (acc[episode.seasonNumber] ??= {
      number: episode.seasonNumber,
      available: true,
      episodes: {},
    })
    season.episodes[episode.episodeNumber] = {
      number: episode.episodeNumber,
      seasonNumber: episode.seasonNumber,
      available: episode.hasFile,
    }
    if (!episode.hasFile) {
      season.available = false
    }
    return acc
  }, {})

const requestAdapter =
  (users: UserMap) =>
  (request: jellyseerrComponents['schemas']['MediaRequest']): Request => {
    if (!request.requestedBy) {
      throw new Error(`Request ${request.id} has no user associated with it`)
    }

    const user = users[request.requestedBy.id]
    if (!user) {
      throw new Error(
        `User ${request.requestedBy.id} on request ${request.id} not found`,
      )
    }

    return {
      user,
    }
  }

export const fromSeries =
  (users: UserMap) =>
  (
    series: jellyseerrComponents['schemas']['TvDetails'] & {
      episodes: sonarrComponents['schemas']['EpisodeResource'][]
    },
  ): MediaInfo<'tv'> => ({
    id: series.id,
    title: series.name,
    type: 'tv',
    overview: series.overview,
    image: imageUrlFromPath(series.posterPath),
    status: statusTextFromCode(series.mediaInfo?.status ?? 0),
    link: `${config.JELLYSEER_PUBLIC_URL}/tv/${series.id}`,
    requests: series.mediaInfo?.requests.map(requestAdapter(users)) ?? [],
    seasons: fromEpisodes(series.episodes),
    ...downloadStatusSummary(series.mediaInfo?.downloadStatus ?? []),
  })

export const fromMovie =
  (users: UserMap) =>
  (
    movie: jellyseerrComponents['schemas']['MovieDetails'],
  ): MediaInfo<'movie'> => ({
    id: movie.id,
    title: movie.title,
    type: 'movie',
    overview: movie.overview,
    image: imageUrlFromPath(movie.posterPath),
    status: statusTextFromCode(movie.mediaInfo?.status ?? 0),
    link: `${config.JELLYSEER_PUBLIC_URL}/movie/${movie.id}`,
    requests: movie.mediaInfo?.requests.map(requestAdapter(users)) ?? [],
    seasons: undefined,
    ...downloadStatusSummary(movie.mediaInfo?.downloadStatus ?? []),
  })
