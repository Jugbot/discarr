// @ts-ignore
import js from '@eslint/js'
import globals from 'globals'
// @ts-ignore
import reactHooks from 'eslint-plugin-react-hooks'
// @ts-ignore
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
// @ts-ignore
import eslintConfigPrettier from 'eslint-config-prettier'
// @ts-ignore
import turbo from 'eslint-plugin-turbo'
// @ts-ignore
import react from 'eslint-plugin-react'

import { includeIgnoreFile } from '@eslint/compat'

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const gitignorePath = path.resolve(__dirname, '.gitignore')

export default tseslint.config(
  includeIgnoreFile(gitignorePath),
  { ignores: ['dist'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      eslintConfigPrettier,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      turbo,
      react,
    },
    settings: { react: { version: '18.3' } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': 'warn',
      'turbo/no-undeclared-env-vars': 'error',
      'no-console': 'warn',
    },
  },
)
