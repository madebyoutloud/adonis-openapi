import path from 'node:path'
import type Configure from '@adonisjs/core/commands/configure'

export async function configure(command: Configure) {
  const stubRoot = path.resolve(import.meta.dirname, '..', 'stubs')
  const codemods = await command.createCodemods()

  await codemods.makeUsingStub(stubRoot, 'config/openapi.stub', {})

  await codemods.updateRcFile((rcFile) => {
    rcFile
      .addProvider('@outloud/adonis-openapi/provider')
      .addCommand('@outloud/adonis-openapi/commands')
      .addMetaFile('.adonisjs/openapi.json', false)
      .addAssemblerHook('buildStarting', '@outloud/adonis-openapi/hooks')
  })
}
