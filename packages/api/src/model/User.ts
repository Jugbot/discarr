import { components } from '../generated/overseerrAPI'
import { client as jellyseerrClient } from '../api/jellyseer'

export interface User {
  discordId: string | null
  name: string
}

export type UserMap = {
  [userId: number]: User
}

export const userAdapter = async (
  user: components['schemas']['User'],
): Promise<User> => {
  return {
    name: user.displayName ?? 'Unknown',
    ...(await getNotificationSettings(user.id)),
  }
}

async function getNotificationSettings(userId: number) {
  const res = await jellyseerrClient.GET(
    '/user/{userId}/settings/notifications',
    {
      params: {
        path: {
          userId,
        },
      },
    },
  )

  if (!res.data) {
    throw new Error(
      `Error fetching notification settings: ${res.response.status}`,
      {
        cause: res.error,
      },
    )
  }

  return {
    discordId: res.data.discordEnabled ? res.data.discordId : null,
  }
}

export async function getUsers() {
  const res = await jellyseerrClient.GET('/user', {
    params: {
      query: {
        take: 9999,
      },
    },
  })

  if (!res.data) {
    throw new Error(`Error fetching users: ${res.response.status}`, {
      cause: res.error,
    })
  }

  return res.data.results.reduce(
    async (accPromise, user) => {
      return accPromise.then(async (acc) => ({
        ...acc,
        [user.id]: await userAdapter(user),
      }))
    },
    Promise.resolve({}) as Promise<UserMap>,
  )
}
