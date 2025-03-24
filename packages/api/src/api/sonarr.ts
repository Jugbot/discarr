import createClient from 'openapi-fetch'
import { paths } from '../generated/sonarrAPI'
import { client as jellyseerClient } from './jellyseer'

import config from '../config'

const sonarrConnection = {
  baseUrl: config.SONARR_URL ? `${config.SONARR_URL}/api/v3/` : undefined,
  apiKey: config.SONARR_API_KEY,
}

const sonarrInfo = await jellyseerClient.GET('/settings/sonarr')
const firstResult = sonarrInfo?.data?.at(0)
if (firstResult) {
  sonarrConnection.baseUrl = `http${firstResult.useSsl ? 's' : ''}://${firstResult.hostname}:${firstResult.port}/api/v3/`
  sonarrConnection.apiKey = firstResult.apiKey
}

if (!sonarrConnection.baseUrl) {
  throw new Error(
    'No sonarr instance on jellyseerr nor SONARR_URL variable found.',
  )
}

if (!sonarrConnection.apiKey) {
  throw new Error(
    'No sonarr instance on jellyseerr nor SONARR_API_KEY variable found.',
  )
}

export const client = createClient<paths>({
  baseUrl: sonarrConnection.baseUrl,
  headers: { 'X-API-Key': sonarrConnection.apiKey },
})
