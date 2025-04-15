import {
  integer,
  pgTable,
  primaryKey,
  varchar,
  json,
  pgEnum,
} from 'drizzle-orm/pg-core'

export const MediaType = pgEnum('media_type', ['movie', 'tv'])

export const Media = pgTable(
  'media',
  {
    jellyseerr_id: integer('jellyseerr_id').notNull(),
    type: MediaType('type').notNull(),
    thread_id: varchar('thread_id', { length: 255 }).notNull().unique(),
    // Last known state of media so we can generate faux-events
    last_state: json('last_state').default({}),
  },
  (media) => [
    primaryKey({
      columns: [media.type, media.jellyseerr_id, media.thread_id],
    }),
  ],
)
