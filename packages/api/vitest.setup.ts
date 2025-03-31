import { beforeAll, afterEach, afterAll } from 'vitest'
import { server as jellyseerrMock } from './src/generated/jellyseerrMock/node'
import { server as sonarrMock } from './src/generated/sonarrMock/node'
import { server as radarrMock } from './src/generated/radarrMock/node'

const servers = [jellyseerrMock, sonarrMock, radarrMock]

beforeAll(() =>
  servers.forEach((server) =>
    server.listen({
      onUnhandledRequest: 'error',
    }),
  ),
)
afterEach(() => servers.forEach((server) => server.resetHandlers()))
afterAll(() => servers.forEach((server) => server.close()))
