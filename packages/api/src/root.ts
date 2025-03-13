import { pingRouter } from './router/ping'
import { postRouter } from './router/post'
import { createTRPCRouter } from './trpc'

export const appRouter = createTRPCRouter({
  post: postRouter,
  ping: pingRouter,
})

export type AppRouter = typeof appRouter
