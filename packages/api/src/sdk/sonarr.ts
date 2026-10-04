import createClient, { Client } from 'openapi-fetch'
import { paths } from '../generated/sonarrAPI'
import { client as jellyseerClient } from './jellyseer'

import { config } from '../config'
import { logger } from '../logger'

async function getConnectionSettings() {
  const sonarrConnection = {
    baseUrl: config.SONARR_URL,
    apiKey: config.SONARR_API_KEY,
  }

  const sonarrInfo = await jellyseerClient.GET('/settings/sonarr')
  const firstResult = sonarrInfo?.data?.at(0)
  if (firstResult) {
    sonarrConnection.baseUrl ||= `http${firstResult.useSsl ? 's' : ''}://${firstResult.hostname}:${firstResult.port}`
    sonarrConnection.apiKey ||= firstResult.apiKey
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
  return sonarrConnection
}

let client: Client<paths> | null = null

export async function getClient() {
  if (client) {
    return client
  }

  const { baseUrl, apiKey } = await getConnectionSettings()
  client = createClient<paths>({
    baseUrl: baseUrl,
    headers: { 'X-API-Key': apiKey },
    fetch: (...args) => {
      return fetch(...args)
    },
  })

  logger.debug(`Connecting to Sonarr API at ${baseUrl}`)
  logger.debug(`Using Sonarr API key ${apiKey}`)

  await client.GET('/api').then(({ response }) => {
    if (!response.ok)
      throw new Error(`Failed to connect to Sonarr API: ${response.statusText}`)
    logger.verbose('Connected to Sonarr API')
  })

  return client
}
