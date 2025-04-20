import createClient, { Client } from 'openapi-fetch'
import { paths } from '../generated/radarrAPI'
import { client as jellyseerClient } from './jellyseer'

import { config } from '../config'
import { logger } from '../logger'

async function getConnectionSettings() {
  const radarrConnection = {
    baseUrl: config.RADARR_URL,
    apiKey: config.RADARR_API_KEY,
  }

  const radarrInfo = await jellyseerClient.GET('/settings/radarr')
  const firstResult = radarrInfo?.data?.at(0)
  if (firstResult) {
    radarrConnection.baseUrl ||= `http${firstResult.useSsl ? 's' : ''}://${firstResult.hostname}:${firstResult.port}`
    radarrConnection.apiKey ||= firstResult.apiKey
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

  return radarrConnection
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

  logger.debug(`Connecting to Radarr API at ${baseUrl}`)
  logger.debug(`Using Radarr API key ${apiKey}`)

  await client.GET('/api').then(({ response }) => {
    if (!response.ok)
      throw new Error(`Failed to connect to Radarr API: ${response.statusText}`)
    logger.verbose('Connected to Radarr API')
  })

  return client
}
