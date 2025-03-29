export interface User {
  discordId: string | null
  name: string
}

/** In-memory collection of all users */
export type UserMap = {
  [userId: number]: User
}
