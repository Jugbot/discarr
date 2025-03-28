export interface User {
  discordId: string | null
  name: string
}

export type UserMap = {
  [userId: number]: User
}
