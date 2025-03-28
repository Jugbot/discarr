import { components } from '../generated/overseerrAPI'
import { User } from '../model/User'
import { getNotificationSettings } from '../service/user'

export const userAdapter = async (
  user: components['schemas']['User'],
): Promise<User> => {
  return {
    name: user.displayName ?? 'Unknown',
    ...(await getNotificationSettings(user.id)),
  }
}
