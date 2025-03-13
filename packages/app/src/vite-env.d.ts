/// <reference types="vite/client" />
/// <reference types="vitest/importMeta" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
