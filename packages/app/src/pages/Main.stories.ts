import type { Meta, StoryObj } from '@storybook/react'

import { Main } from './Main'
import { trpcMsw } from '../../.storybook/trpcMsw'

const meta = {
  title: 'Main Page',
  component: Main,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Main>

export default meta
type Story = StoryObj<typeof meta>

export const MainPage: Story = {
  parameters: {
    msw: [
      trpcMsw.post.ping.query((_req, res, ctx) => {
        return res(ctx.status(200), ctx.data('pong'))
      }),
    ],
  },
}

export const MainPageLoading: Story = {
  parameters: {
    msw: [
      trpcMsw.post.ping.query((_req, res, ctx) => {
        return res(ctx.delay('infinite'))
      }),
    ],
  },
}
