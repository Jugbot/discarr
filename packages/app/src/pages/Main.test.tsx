import { it } from 'vitest'
import { screen } from '@testing-library/react'
import { composeStories } from '@storybook/react'

import * as AppStories from './Main.stories'

const { MainPage, MainPageLoading } = composeStories(AppStories)

it('renders', async () => {
  await MainPage.run()
  screen.getByText(/Vite \+ React/i)
})

it('loads data', async () => {
  await MainPage.run()
  await screen.findByText(/ping: pong/i)
})

it('renders loading state', async () => {
  await MainPageLoading.run()
  screen.getByText(/ping: loading.../i)
})
