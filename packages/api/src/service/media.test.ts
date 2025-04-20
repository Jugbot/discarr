import { describe, expect, it, vi } from 'vitest'
import { mediaService } from './media'
import { mockDB } from '@acme/db/mock'
import type { Logger } from 'winston'

const { logger: loggerMock } = await vi.importMock<{ logger: Logger }>(
  '../logger.ts',
)

describe('Media Service', () => {
  it('should get messages', async () => {
    const { getMedia } = await mediaService({
      db: mockDB,
      logger: loggerMock,
    })

    const media = await getMedia({
      [1]: {
        name: 'test user',
        discordId: null,
      },
    })
    expect(media).toBeDefined()
    expect(loggerMock.error).toHaveBeenCalledTimes(0)
    expect(media.length).toBeGreaterThan(0)
  })
})
