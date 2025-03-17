import { defineConfig } from 'vite'
import { VitePluginNode } from 'vite-plugin-node'

export default defineConfig({
  build: {
    target: 'node22',
  },
  plugins: [
    ...VitePluginNode({
      adapter: 'express',
      appPath: 'src/server.ts',
    }),
  ],
})
