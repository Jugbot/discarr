import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'

if (process.argv.length < 3) {
  console.error('Usage: node gen-types.js <output-folder>')
  process.exit(1)
}

const OUTPUT_FOLDER = process.argv[2]

if (fs.existsSync(OUTPUT_FOLDER)) {
  fs.rmSync(OUTPUT_FOLDER, { recursive: true, force: true })
}

const commands = [
  `pnpx openapi-typescript "https://raw.githubusercontent.com/Jugbot/jellyseerr/refs/heads/develop/jellyseerr-api.yml" -o "${OUTPUT_FOLDER}/overseerrAPI.ts" --properties-required-by-default`,
  `pnpx openapi-typescript "https://raw.githubusercontent.com/Sonarr/Sonarr/develop/src/Sonarr.Api.V3/openapi.json" -o "${OUTPUT_FOLDER}/sonarrAPI.ts"`,
  `pnpx openapi-typescript "https://raw.githubusercontent.com/Radarr/Radarr/develop/src/Radarr.Api.V3/openapi.json" -o "${OUTPUT_FOLDER}/radarrAPI.ts"`,
]

const runCommand = (cmd) => {
  return new Promise((resolve, reject) => {
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
    results.forEach((result) => console.log(result))
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
