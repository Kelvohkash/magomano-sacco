import { copyFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const workerBuild = resolve('.wrangler/pages-worker')
const workerSource = resolve(workerBuild, 'index.js')
const workerOutput = resolve('dist/_worker.js')

mkdirSync(dirname(workerOutput), { recursive: true })
copyFileSync(workerSource, workerOutput)
rmSync(workerBuild, { recursive: true, force: true })
