import {
  integer,
  pgTable,
  primaryKey,
  varchar,
  json,
} from 'drizzle-orm/pg-core'

export const Media = pgTable(
  'media',
  {
    jellyseerr_id: integer('jellyseerr_id').notNull().unique(),
    thread_id: varchar('thread_id', { length: 255 }).notNull().unique(),
    // Last known state of media so we can generate faux-events
    last_state: json('last_state').$type<Record<string, unknown>>().default({}),
  },
  (media) => ({
    compoundKey: primaryKey({
      columns: [media.jellyseerr_id, media.thread_id],
    }),
  }),
)
