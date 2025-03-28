import { userAdapter } from '../adapter/user'
import { UserMap } from '../model/User'
import { client as jellyseerrClient } from '../sdk/jellyseer'

export async function getNotificationSettings(userId: number) {
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
