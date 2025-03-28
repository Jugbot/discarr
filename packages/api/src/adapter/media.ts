import { components } from '../generated/overseerrAPI'
import { config } from '../config'
import { Epsiode, MediaInfo, Request } from '../model/Media'
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
      return 'Partially Available'
    case 5:
      return 'Available'
    case 6:
      return 'Blacklisted'
    default:
      return 'Unknown'
  }
}

const downloadStatusSummary = (
  downloads: components['schemas']['DownloadingItem'][],
) => {
  const episodes = downloads.reduce<Epsiode[]>((result, download) => {
    if (!download.episode) return result

    return [
      ...result,
      {
        season: download.episode.seasonNumber,
        episode: download.episode.absoluteEpisodeNumber,
        downloadStatus: {
          completion: (download.size - download.sizeLeft) / download.size,
          timeEstimate: download.estimatedCompletionTime,
        },
      },
    ]
  }, [])

  const totalCompletionFraction = downloads.reduce(
    (acc, status) => ({
      numerator: acc.numerator + status.size - status.sizeLeft,
      denominator: acc.denominator + status.size,
    }),
    { numerator: 0, denominator: 0 },
  )

  const timeEstimate = downloads
    .map((s) => s.estimatedCompletionTime)
    .reduce((last, next) => (next > last ? next : last), '')

  return {
    episodes,
    downloadStatus: {
      completion: totalCompletionFraction.denominator
        ? totalCompletionFraction.numerator /
          totalCompletionFraction.denominator
        : 0,
      timeEstimate,
    },
  }
}

const requestAdapter =
  (users: UserMap) =>
  (request: components['schemas']['MediaRequest']): Request => {
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
  (series: components['schemas']['TvDetails']): MediaInfo<'tv'> => ({
    id: series.id,
    title: series.name,
    type: 'tv',
    overview: series.overview,
    image: imageUrlFromPath(series.posterPath),
    status: statusTextFromCode(series.mediaInfo.status),
    link: `${config.JELLYSEER_PUBLIC_URL}/tv/${series.id}`,
    requests: series.mediaInfo.requests.map(requestAdapter(users)),
    ...downloadStatusSummary(series.mediaInfo.downloadStatus),
  })

export const fromMovie =
  (users: UserMap) =>
  (movie: components['schemas']['MovieDetails']): MediaInfo<'movie'> => ({
    id: movie.id,
    title: movie.title,
    type: 'movie',
    overview: movie.overview,
    image: imageUrlFromPath(movie.posterPath),
    status: statusTextFromCode(movie.mediaInfo.status),
    link: `${config.JELLYSEER_PUBLIC_URL}/movie/${movie.id}`,
    requests: movie.mediaInfo.requests.map(requestAdapter(users)),
    ...downloadStatusSummary(movie.mediaInfo.downloadStatus),
  })
