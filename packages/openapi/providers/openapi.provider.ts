import fs from 'node:fs'
import type { ApplicationService } from '@adonisjs/core/types'
import type { OpenAPIV3_1 } from 'openapi-types'
import type { Router } from '@adonisjs/core/http'
import type { ResourceActionNames } from '@adonisjs/core/types/http'
import defu from 'defu'
import type { OpenAPIConfig } from '../src/types.js'
import { registerRouteMacros, type RouteResourceOpenApiOptions } from '../src/bindings.js'
import { meta } from '../src/meta.js'
import { ui } from '../src/ui.js'

export default class OpenAPIProvider {
  private spec?: OpenAPIV3_1.Document | Promise<OpenAPIV3_1.Document>
  private declare config: OpenAPIConfig

  constructor(protected app: ApplicationService) {}

  get specPath() {
    return this.config.endpoints?.spec ?? '/openapi.json'
  }

  register() {
    registerRouteMacros(meta)
  }

  async boot() {
    this.config = this.app.config.get<OpenAPIConfig>('openapi')
    const router = await this.app.container.make('router')

    if (this.config.enabled) {
      this.registerSpecRoute(router)
      this.registerDocsRoute(router)
    }
  }

  private async getSpec(): Promise<OpenAPIV3_1.Document> {
    const filePath = this.app.makePath('.adonisjs/openapi.json')
    const spec = JSON.parse(await fs.promises.readFile(filePath, 'utf-8'))

    return defu(this.config.document, spec) as OpenAPIV3_1.Document
  }

  private registerSpecRoute(router: Router) {
    router.get(this.specPath, async () => {
      if (!this.spec) {
        this.spec = this.getSpec()
        this.spec = await this.spec
      }

      return this.spec
    })
  }

  private registerDocsRoute(router: Router) {
    const path = this.config.endpoints?.ui ?? '/docs'
    const provider = ui[this.config.provider]
    const baseUrl = process.env.APP_URL ?? ''
    const specPath = `${baseUrl}${this.specPath}`

    router.get(path, () => provider(specPath, this.config.scalar))
  }
}

declare module '@adonisjs/core/http' {
  export interface Route {
    openapi: (options: OpenAPIV3_1.OperationObject) => this
  }

  export interface RouteResource<ActionNames extends ResourceActionNames = ResourceActionNames> {
    openapi: (options: RouteResourceOpenApiOptions<ActionNames>) => this
  }

  export interface RouteGroup {
    openapi: (options: OpenAPIV3_1.OperationObject) => this
  }
}
