import { beforeAll, afterEach, afterAll } from 'vitest'
import { handlers as jellyseerrHandlers } from './src/generated/jellyseerrMock/handlers'
import { handlers as sonarrHandlers } from './src/generated/sonarrMock/handlers'
import { handlers as radarrHandlers } from './src/generated/radarrMock/handlers'
import { setupServer } from 'msw/node'

const handlers = [...jellyseerrHandlers, ...sonarrHandlers, ...radarrHandlers]

const server = setupServer(...handlers)

beforeAll(() =>
  server.listen({
    onUnhandledRequest: 'error',
  }),
)
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
