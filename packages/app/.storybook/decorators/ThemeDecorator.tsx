import { Theme } from '@radix-ui/themes'
import type { Decorator } from '@storybook/react'

export const ThemeDecorator: Decorator = (Story) => (
  <Theme>
    <Story />
  </Theme>
)
