import type { Preview } from '@storybook/react'

import { initialize, mswLoader } from 'msw-storybook-addon'
import { ThemeDecorator } from './decorators/ThemeDecorator'
import { QueryDecorator } from './decorators/QueryDecorator'

import '@radix-ui/themes/styles.css'
import '../src/reset.css'

initialize({
  onUnhandledRequest: ({ url, method }) => {
    const port = new URL(url).port
    if (port === '3000') {
      console.warn(`Unhandled ${method} request to ${url.toString()}.`)
    }
  },
})

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [ThemeDecorator, QueryDecorator],
  loaders: [mswLoader],
}

export default preview
