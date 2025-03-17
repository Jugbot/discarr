import { components } from '../generated/overseerrAPI'
import config from '../config'

interface Epsiode {
  season: number
  episode: number
  downloadStatus: DownloadStatus
}

interface DownloadStatus {
  completion: number
  timeEstimate: string
}

export interface MediaInfo<Type extends 'movie' | 'tv' = 'movie' | 'tv'> {
  id: number
  title: string
  type: Type
  overview: string
  image: string
  status:
    | 'Pending'
    | 'Processing'
    | 'Partially Available'
    | 'Available'
    | 'Blacklisted'
    | 'Unknown'
  episodes: Epsiode[]
  downloadStatus: DownloadStatus
  link: string
}

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
          completion: download.size / download.sizeLeft,
          timeEstimate: download.estimatedCompletionTime,
        },
      },
    ]
  }, [])

  const completionFraction = downloads.reduce(
    (acc, status) => ({
      numerator: acc.numerator + status.size,
      denominator: acc.denominator + status.sizeLeft,
    }),
    { numerator: 0, denominator: 0 },
  )

  const timeEstimate = downloads
    .map((s) => s.estimatedCompletionTime)
    .reduce((last, next) => (next > last ? next : last), '')

  return {
    episodes,
    downloadStatus: {
      completion: completionFraction.denominator
        ? completionFraction.numerator / completionFraction.denominator
        : 1,
      timeEstimate,
    },
  }
}

export const fromSeries =
  (media: components['schemas']['MediaInfo']) =>
  (series: components['schemas']['TvDetails']): MediaInfo<'tv'> => ({
    id: series.id,
    title: series.name,
    type: 'tv',
    overview: series.overview,
    image: imageUrlFromPath(series.posterPath),
    status: statusTextFromCode(media.status),
    link: media.mediaUrl ?? `${config.JELLYSEER_URL}/tv/${media.tmdbId}`,
    ...downloadStatusSummary(media.downloadStatus),
  })

export const fromMovie =
  (media: components['schemas']['MediaInfo']) =>
  (movie: components['schemas']['MovieDetails']): MediaInfo<'movie'> => ({
    id: movie.id,
    title: movie.title,
    type: 'movie',
    overview: movie.overview,
    image: imageUrlFromPath(movie.posterPath),
    status: statusTextFromCode(media.status),
    link: media.mediaUrl ?? `${config.JELLYSEER_URL}/movie/${media.tmdbId}`,
    ...downloadStatusSummary(media.downloadStatus),
  })
