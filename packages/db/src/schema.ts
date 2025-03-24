import { integer, pgTable, primaryKey, varchar } from 'drizzle-orm/pg-core'

export const Media = pgTable(
  'media',
  {
    jellyseerr_id: integer('jellyseerr_id').notNull().unique(),
    // TODO: check if this is the right size
    thread_id: varchar('thread_id', { length: 255 }).notNull().unique(),
  },
  (media) => ({
    compoundKey: primaryKey({
      columns: [media.jellyseerr_id, media.thread_id],
    }),
  }),
)
