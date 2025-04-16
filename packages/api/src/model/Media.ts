import { User } from './User'

export interface Season {
  number: number
  available: boolean
  episodes: Record<number, Episode>
}

export interface Episode {
  number: number
  seasonNumber: number
  available: boolean
}

export interface DownloadStatus {
  completion: number
}

export interface Request {
  user: User
}

export interface MediaInfo<Type extends 'movie' | 'tv' = 'movie' | 'tv'> {
  id: number
  title: string
  type: Type
  overview: string
  image: string
  status: 'Pending' | 'Processing' | 'Available' | 'Blacklisted' | 'Unknown'
  seasons: Type extends 'movie' ? undefined : Record<number, Season>
  downloadStatus: DownloadStatus
  link: string
  requests: Request[]
}
