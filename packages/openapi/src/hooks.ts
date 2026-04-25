import util from 'node:util'
import { exec as cpExec } from 'node:child_process'
import type { Bundler } from '@adonisjs/assembler'

const exec = util.promisify(cpExec)

const hook: (server: Bundler) => Promise<void> = async (bundler) => {
  bundler.ui.logger.info('generating openapi', { suffix: 'openapi' })

  const { stderr } = await exec('node ace openapi:generate')

  if (stderr) throw new Error(stderr)
}

export const generateOpenapi = {
  run: hook,
}

export default hook
