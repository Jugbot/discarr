import { assert, describe, it } from 'vitest'
import { getMedia } from './media'

describe('Media Service', () => {
  it('should get messages', async () => {
    const medias = await getMedia({})
    assert.equal(medias.length, 0)
  })
})
