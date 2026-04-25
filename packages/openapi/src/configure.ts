import path from 'node:path'
import type Configure from '@adonisjs/core/commands/configure'

export async function configure(command: Configure) {
  const codemods = await command.createCodemods()

  await codemods.makeUsingStub(path.resolve(import.meta.dirname, '..', 'stubs'), 'config/openapi.stub', {})

  await codemods.updateRcFile((rcFile) => {
    rcFile
      .addProvider('@outloud/adonis-openapi/provider')
      .addCommand('@outloud/adonis-openapi/commands')
      .addMetaFile('.adonisjs/openapi.json', false)
      .addAssemblerHook('buildStarting', '@outloud/adonis-openapi/hooks')
  })
}
