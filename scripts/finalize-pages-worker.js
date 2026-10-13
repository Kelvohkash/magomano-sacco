import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const workerBuild = resolve('.wrangler/pages-worker')
const workerSource = resolve(workerBuild, 'index.js')
const workerOutput = resolve('dist/_worker.js')

mkdirSync(dirname(workerOutput), { recursive: true })
const worker = readFileSync(workerSource, 'utf8')
// Wrangler's node compatibility bundle emits these class static blocks to set
// class names. Cloudflare's Pages publisher can fail while initializing them.
const finalizedWorker = worker.replace(/\s*static \{\n\s*__name\(this, "[^"]+"\);\n\s*\}/g, '')
writeFileSync(workerOutput, finalizedWorker)
rmSync(workerBuild, { recursive: true, force: true })
