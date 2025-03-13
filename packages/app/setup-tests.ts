import { beforeAll } from 'vitest'
import { render as testingLibraryRender } from '@testing-library/react'
import { setProjectAnnotations } from '@storybook/react'
import * as previewAnnotations from './.storybook/preview'

const annotations = setProjectAnnotations([
  previewAnnotations,
  { testingLibraryRender },
])

beforeAll(() => annotations.beforeAll?.())
