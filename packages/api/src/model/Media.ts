import { User } from './User'

export interface Epsiode {
  season: number
  episode: number
  downloadStatus: DownloadStatus
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
  episodes: Epsiode[]
  downloadStatus: DownloadStatus
  link: string
  requests: Request[]
}
