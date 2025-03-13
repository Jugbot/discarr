import type { AppRouter } from '@acme/api'
import { createTRPCMsw } from 'msw-trpc'
import superjson from 'superjson'

export const trpcMsw = createTRPCMsw<AppRouter>({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  transformer: {
    input: superjson,
    output: superjson,
  },
})
