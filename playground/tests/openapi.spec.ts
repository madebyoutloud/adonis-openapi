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

function ace(args: string[], extra: Record<string, string> = {}) {
  return exec('node', ['ace', ...args], { cwd: root, env: { ...env, ...extra } })
}

async function generate(extra: Record<string, string> = {}) {
  await ace(['openapi:generate'], extra)
  return JSON.parse(await readFile(new URL('.adonisjs/openapi.json', root), 'utf-8'))
}

function responses(document: any): [string, Record<string, any>][] {
  return Object.entries(document.paths).flatMap(([path, item]: [string, any]) => {
    return Object.entries(item).map(([method, operation]: [string, any]) => {
      return [`${method} ${path}`, operation.responses ?? {}] as [string, Record<string, any>]
    })
  })
}

describe('openapi', () => {
  let document: any

  beforeAll(async () => {
    await ace(['codegen'])
    document = await generate()
  })

  it('generates document', async () => {
    await expect(JSON.stringify(document, null, 2) + '\n').toMatchFileSnapshot('./__snapshots__/openapi.json')
  })

  it('keeps only success responses with rawResponses success', async () => {
    const success = await generate({ OPENAPI_RAW_RESPONSES: 'success' })

    for (const [operation, all] of responses(document)) {
      const kept = responses(success).find(([name]) => name === operation)![1]
      const expected = Object.fromEntries(Object.entries(all).filter(([code]) => Number(code) < 300))

      expect(kept, operation).toEqual(expected)
    }
  })
})
