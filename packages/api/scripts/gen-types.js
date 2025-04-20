import { exec } from 'child_process'
import { config } from 'dotenv'
import path from 'path'
import fs from 'fs'

const { error } = config({
  path: '.env.test',
})

if (error) {
  throw error
}

const OUTPUT_FOLDER = process.argv[2]

if (!OUTPUT_FOLDER) {
  console.error('Usage: node gen-types.js <output-folder>')
  process.exit(1)
}

if (fs.existsSync(OUTPUT_FOLDER)) {
  console.info(`Cleaning up ${OUTPUT_FOLDER}...`)
  fs.rmSync(OUTPUT_FOLDER, { recursive: true, force: true })
  fs.mkdirSync(OUTPUT_FOLDER)
}

const JELLYSEERR_SCHEMA_URL =
  'https://raw.githubusercontent.com/Jugbot/jellyseerr/refs/heads/develop/jellyseerr-api.yml'
const SONARR_SCHEMA_URL =
  'https://raw.githubusercontent.com/Sonarr/Sonarr/develop/src/Sonarr.Api.V3/openapi.json'
const RADARR_SCHEMA_URL =
  'https://raw.githubusercontent.com/Radarr/Radarr/develop/src/Radarr.Api.V3/openapi.json'

const commands = [
  // types
  `pnpx openapi-typescript "${JELLYSEERR_SCHEMA_URL}" -o "${OUTPUT_FOLDER}/jellyseerrAPI.ts" --properties-required-by-default`,
  `pnpx openapi-typescript "${SONARR_SCHEMA_URL}" -o "${OUTPUT_FOLDER}/sonarrAPI.ts" --properties-required-by-default`,
  `pnpx openapi-typescript "${RADARR_SCHEMA_URL}" -o "${OUTPUT_FOLDER}/radarrAPI.ts" --properties-required-by-default`,
  // mocks
  `pnpx msw-auto-mock "${JELLYSEERR_SCHEMA_URL}" -o "${OUTPUT_FOLDER}/jellyseerrMock" --base-url ${process.env.JELLYSEER_URL}/api/v1 --typescript`,
  `pnpx msw-auto-mock "${SONARR_SCHEMA_URL}" -o "${OUTPUT_FOLDER}/sonarrMock" --typescript`,
  `pnpx msw-auto-mock "${RADARR_SCHEMA_URL}" -o "${OUTPUT_FOLDER}/radarrMock" --typescript`,
]

/**
 * @param {string} filePath
 * @returns {Promise<void>}
 */
const addTSNoCheck = async (filePath) => {
  filePath = path.resolve(filePath)
  console.info(`Fixing "${filePath}"`)
  const data = await fs.promises.readFile(filePath, 'utf8')
  const result =
    `// eslint-disable-next-line @typescript-eslint/ban-ts-comment\n// @ts-nocheck\n`.concat(
      data,
    )
  await fs.promises.writeFile(filePath, result, 'utf8')
}

/**
 * @param {string} cmd
 * @returns {Promise<string>}
 */
const runCommand = (cmd) => {
  return new Promise((resolve, reject) => {
    console.info(`> ${cmd}`)
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${stderr}`)
      } else {
        resolve(stdout)
      }
    })
  })
}

Promise.all(commands.map(runCommand))
  .then((results) => {
    results.forEach((result) => result && console.info(result))
    return Promise.all([
      addTSNoCheck(`${OUTPUT_FOLDER}/jellyseerrMock/handlers.ts`),
      addTSNoCheck(`${OUTPUT_FOLDER}/sonarrMock/handlers.ts`),
      addTSNoCheck(`${OUTPUT_FOLDER}/radarrMock/handlers.ts`),
    ])
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
