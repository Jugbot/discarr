import { createTRPCRouter, publicProcedure } from '../trpc'

export const pingRouter = createTRPCRouter({
  ping: publicProcedure.query(() => 'pong'),
})
