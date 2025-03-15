import { ApplicationService } from '@adonisjs/core/types'
import { OpenAPI } from '../src/openapi.js'
import { OpenAPIConfig } from '../src/types.js'

export default class OpenAPIProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(OpenAPI, async () => {
      const config = this.app.config.get<OpenAPIConfig>('openapi')
      const router = await this.app.container.make('router')
      const logger = await this.app.container.make('logger')

      return new OpenAPI(config, router, logger, this.app.inProduction)
    })
    this.app.container.alias('openapi', OpenAPI)
  }
}

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    openapi: OpenAPI
  }
}
