import createClient from 'openapi-fetch'
import { paths } from '../generated/radarrAPI'
import { client as jellyseerClient } from './jellyseer'

import config from '../config'

const radarrConnection = {
  baseUrl: config.RADARR_URL ? `${config.RADARR_URL}/api/v3/` : undefined,
  apiKey: config.RADARR_API_KEY,
}

const radarrInfo = await jellyseerClient.GET('/settings/radarr')
const firstResult = radarrInfo?.data?.at(0)
if (firstResult) {
  radarrConnection.baseUrl = firstResult.baseUrl
  radarrConnection.apiKey = firstResult.apiKey
}

if (!radarrConnection.baseUrl) {
  throw new Error(
    'No radarr instance on jellyseerr nor RADARR_URL variable found.',
  )
}

if (!radarrConnection.apiKey) {
  throw new Error(
    'No radarr instance on jellyseerr nor RADARR_API_KEY variable found.',
  )
}

export const client = createClient<paths>({
  baseUrl: radarrConnection.baseUrl,
  headers: { 'X-API-Key': radarrConnection.apiKey },
})
