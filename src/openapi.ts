import type { Route } from '@adonisjs/core/http'
import type { HttpRouterService } from '@adonisjs/core/types'
import { generateDocument, type OpenAPIDocument } from 'openapi-metadata'
import type { Logger } from '@adonisjs/core/logger'
import { generateRapidocUI, generateSwaggerUI } from 'openapi-metadata/ui'
import type { OpenAPIConfig, ScalarConfig } from './types.js'
import { RouterLoader } from './router_loader.js'
import { LuxonTypeLoader } from './loaders/luxon.js'
import { VineTypeLoader } from './loaders/vine.js'

const OpenAPIController = () => import('./controllers/openapi_controller.js')

export class OpenAPI {
  #router: HttpRouterService
  #document?: OpenAPIDocument
  #routerLoader: RouterLoader
  #logger: Logger
  #isProduction: boolean
  #config: OpenAPIConfig

  constructor(
    config: OpenAPIConfig,
    router: HttpRouterService,
    logger: Logger,
    isProduction: boolean,
  ) {
    this.#router = router
    this.#logger = logger
    this.#routerLoader = new RouterLoader(router, logger, config.router)
    this.#isProduction = isProduction
    this.#config = config
  }

  async buildDocument() {
    if (this.#document && this.#isProduction) {
      return this.#document
    }

    this.#document = await generateDocument({
      controllers: await this.getControllers(),
      customLogger: this.#logger,
      loaders: [LuxonTypeLoader, VineTypeLoader, ...(this.#config.loaders ?? [])],
      document: this.#config.document,
    })

    return this.#document
  }

  private async getControllers() {
    const controllers = await this.#routerLoader.load()

    if (this.#config.controllers) {
      controllers.push(...this.#config.controllers)
    }

    return controllers
  }

  /**
   * Generates HTML do display the OpenAPI documentation UI.
   */
  generateUi(path = '/api'): string {
    const ui = this.#config.ui
    switch (ui) {
      case 'scalar':
        return this.generateScalarUI(path, this.#config.scalar)
      case 'swagger':
        return generateSwaggerUI(path)
      case 'rapidoc':
        return generateRapidocUI(path)
    }
  }

  private generateScalarUI(url: string, { proxy = true }: ScalarConfig = {}) {
    const proxyUrl = typeof proxy === 'string' ? proxy : 'https://proxy.scalar.com'

    return `<!doctype html>
      <html>
        <head>
          <title>API Reference</title>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1" />
        </head>
        <body>
          <script
            id="api-reference"
            data-url="${url}"
            ${proxy ? 'data-proxy-url="' + proxyUrl + '"' : ''}></script>
          <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
        </body>
      </html>`
  }

  /**
   * Registers Json, Yaml and UI OpenAPI routes.
   *
   * - /api
   * - /api.json
   * - /api.yaml
   */
  registerRoutes(path = '/api', routeHandlerModifier?: (route: Route) => void) {
    const route = this.#router.get(path, [OpenAPIController])

    if (routeHandlerModifier) {
      routeHandlerModifier(route)
    }
  }
}
