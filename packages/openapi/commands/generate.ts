import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = ''

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { Generator } = await import('@outloud/adonis-openapi-generator')

    const generator = new Generator(this.app.appRoot, this.app.config.get('openapi.generator'))
    await generator.generate()
  }
}
