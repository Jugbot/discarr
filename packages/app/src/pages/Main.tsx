import { styled } from '@stitches/react'
import reactLogo from '../assets/react.svg'
import viteLogo from '/vite.svg'
import {
  Button,
  Card,
  Link,
  Text,
  Heading,
  Flex,
  ThemePanel,
  Code,
} from '@radix-ui/themes'
import { trpc } from '../trpc'

const Logo = styled('img', {
  height: '6em',
  padding: '1.5em',
  willChange: 'filter',
  transition: 'filter 300ms',
})

export const Main = () => {
  const pong = trpc.post.ping.useQuery()

  const pongDisplay = pong.isFetching ? 'loading...' : pong.data

  return (
    <Flex
      align="center"
      justify="center"
      direction="column"
      gap="3"
      position="fixed"
      inset="0"
    >
      <Flex>
        <Link href="https://vitejs.dev" target="_blank">
          <Logo src={viteLogo} alt="Vite logo" />
        </Link>
        <Link href="https://react.dev" target="_blank">
          <Logo src={reactLogo} alt="React logo" />
        </Link>
      </Flex>
      <Heading as="h1">Vite + React</Heading>
      <Card variant="classic" size="3">
        <Flex align="center" direction="column" gap="2">
          <Button
            onClick={() => {
              pong.refetch().catch((e: unknown) => {
                console.error(e)
              })
            }}
          >
            ping: {pongDisplay}
          </Button>
          <Text as="p">
            Edit <Code>src/App.tsx</Code> and save to test HMR
          </Text>
        </Flex>
      </Card>
      <Text as="p" color="amber">
        Click on the Vite and React logos to learn more
      </Text>
      <ThemePanel />
    </Flex>
  )
}
