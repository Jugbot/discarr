import createClient from 'openapi-fetch'
import { paths } from '../generated/overseerrAPI'

import { config } from '../config'

const baseUrl = `${config.JELLYSEER_URL}/api/v1`

export const client = createClient<paths>({
  baseUrl,
  headers: { 'X-API-Key': config.JELLYSEER_API_KEY },
})
