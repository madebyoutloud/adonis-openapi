import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import type { OpenAPIConfig } from '../src/types.js'
import { meta } from '../src/meta.js'

export default class extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = ''

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { Generator } = await import('@outloud/adonis-openapi-generator')

    const config = this.app.config.get<OpenAPIConfig>('openapi')
    const generator = new Generator({
      root: this.app.appRoot,
      config: config.generator,
      document: config.document,
      meta,
    })
    await generator.generate()
  }
}
