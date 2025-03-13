export default {
  '*': [
    () => 'pnpm install',
    'pnpm _prettier --write',
    'pnpm _eslint --no-warn-ignored --fix',
    () => 'pnpm run check-types',
  ],
}
