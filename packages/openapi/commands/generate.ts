import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { meta } from '../src/meta.js'
import type { OpenAPIConfig } from '../src/types.js'

export default class extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = ''

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { Generator } = await import('@outloud/adonis-openapi-generator')
    const config = this.app.config.get<OpenAPIConfig>('openapi')

    const generator = new Generator(this.app.appRoot, {
      config: config.generator,
      meta,
    })
    await generator.generate(true)
  }
}
