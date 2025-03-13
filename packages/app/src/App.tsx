import { Theme } from '@radix-ui/themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/react-query'
import { Suspense, useState } from 'react'
import { Main } from './pages/Main'
import { trpc } from './trpc'
import superjson from 'superjson'
import { globalCss } from '@stitches/react'
import { BrowserRouter, Route, Routes } from 'react-router'

import resetCss from './reset.css?url'
import radixCss from '@radix-ui/themes/styles.css?url'

const applyGlobalCss = globalCss({
  '@import': [resetCss, radixCss],
})

export function App() {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: import.meta.env.VITE_API_BASE_URL,
        }),
      ],
      transformer: superjson,
    }),
  )

  applyGlobalCss()

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Theme>
            <Suspense fallback="loading...">
              <Routes>
                <Route path="/" element={<Main />} />
              </Routes>
            </Suspense>
          </Theme>
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
