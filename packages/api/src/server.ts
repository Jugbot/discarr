import { createHTTPServer } from '@trpc/server/adapters/standalone'
import { appRouter } from './root'
import { createTRPCContext } from './trpc'
import cors from 'cors'
import { createCaller } from '.'

// import * as cron from 'node-cron';
// console.log('Running a task every minute');
// cron.schedule('* * * * *', () => {
//   const trpc = createCaller(createTRPCContext());
//   console.log('Running a task every minute');
//   // Call your tRPC procedures here
//   // Example: await trpc.someProcedure();
//   void trpc.post.hook({}).catch((error) => {
//     console.error('Error running cron job:');
//     console.error(error);
//   })
// });

const trpc = createCaller(createTRPCContext())
// Call your tRPC procedures here
// Example: await trpc.someProcedure();
void trpc.post.hook().catch((error) => {
  console.error('Error running cron job:')
  console.error(error)
})

const server = createHTTPServer({
  router: appRouter,
  createContext: createTRPCContext,
  middleware: cors(),
})

server.listen(3000)
