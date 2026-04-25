import type { ApplicationService } from '@adonisjs/core/types'
import type { OpenapiConfig } from '../src/types.js'

export default class OpenapiProvider {
  constructor(protected app: ApplicationService) {}

  private getConfig(): OpenapiConfig {
    return this.app.config.get<OpenapiConfig>('openapi', {})
  }

  register() {

  }

  async ready() {

  }
}
