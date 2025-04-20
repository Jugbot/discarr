import { exec } from 'child_process'
import { config } from 'dotenv'
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
  `pnpx msw-auto-mock "${SONARR_SCHEMA_URL}" -o "${OUTPUT_FOLDER}/sonarrMock" --base-url ${process.env.SONARR_URL} --typescript`,
  `pnpx msw-auto-mock "${RADARR_SCHEMA_URL}" -o "${OUTPUT_FOLDER}/radarrMock" --base-url ${process.env.RADARR_URL} --typescript`,
]

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
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
