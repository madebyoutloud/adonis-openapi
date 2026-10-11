import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { beforeAll, describe, expect, it } from 'vitest'

const exec = promisify(execFile)
const root = new URL('../', import.meta.url)

/**
 * Passed explicitly, so the test does not depend on a local `.env` file.
 */
const env = {
  ...process.env,
  NO_COLOR: '1',
  NODE_ENV: 'development',
  PORT: '3333',
  HOST: 'localhost',
  LOG_LEVEL: 'warn',
  APP_KEY: 'playground-test-app-key-32-chars',
  APP_URL: 'http://localhost:3333',
}

function ace(...args: string[]) {
  return exec('node', ['ace', ...args], { cwd: root, env })
}

describe('openapi', () => {
  let document: string

  beforeAll(async () => {
    await ace('codegen')
    await ace('openapi:generate')

    const content = await readFile(new URL('.adonisjs/openapi.json', root), 'utf-8')
    document = JSON.stringify(JSON.parse(content), null, 2) + '\n'
  })

  it('generates document', async () => {
    await expect(document).toMatchFileSnapshot('./__snapshots__/openapi.json')
  })
})
