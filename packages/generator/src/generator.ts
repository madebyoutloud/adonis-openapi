import { join } from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { OpenAPIV3_1 } from 'openapi-types'
import type { Project } from 'ts-morph'
import type TsMorph from 'ts-morph'
import { catchError } from '@outloud/utils'
import { Route } from './route.ts'
import { Context } from './context.ts'
import type { GeneratorOptions, RouteInfo } from './types.ts'
import { Components } from './components.js'
import { Handlers } from './handlers.js'
import { defaultHandlers } from './constants.ts'

export class Generator {
  private declare project: Project
  private declare registry: TsMorph.InterfaceDeclaration
  private declare type: TsMorph.Type
  private handlers: Handlers
  private routes: Route[] = []
  private components: Components
  private paths: OpenAPIV3_1.PathsObject = {}

  constructor(public root: URL, public options: GeneratorOptions) {
    this.components = new Components(this.rootPath)
    this.handlers = new Handlers(defaultHandlers)
  }

  get config() {
    return this.options.config
  }

  get rootPath() {
    return fileURLToPath(this.root)
  }

  context(type = this.type) {
    return new Context(type, {
      project: this.project,
      components: this.components,
      handlers: this.handlers,
      root: this.rootPath,
      node: this.registry,
      resolve: this.options.config.resolve,
    })
  }

  async generate(save = false) {
    await this.loadProject()
    await this.loadRoutes()
    this.options.meta.compute()

    for (const route of this.routes) {
      await this.processRoute(route)
    }

    const document = this.toDocument()

    if (save) {
      await this.save(document)
    }

    return document
  }

  private async save(document: OpenAPIV3_1.Document) {
    await fs.promises.writeFile(
      join(this.rootPath, '.adonisjs/openapi.json'),
      JSON.stringify(document, (_, value) => {
        if (!(value && typeof value === 'object' && !Array.isArray(value))) return value

        return Object.keys(value)
          .toSorted()
          .reduce((sorted, key) => {
            sorted[key] = value[key]
            return sorted
          }, {} as Record<string, any>)
      }),
      'utf-8',
    )
  }

  private async loadProject() {
    const { Project, QuoteKind } = await import('ts-morph')

    this.project = new Project({
      manipulationSettings: { quoteKind: QuoteKind.Single },
      tsConfigFilePath: join(this.rootPath, 'tsconfig.json'),
    })

    const file = this.file('.adonisjs/client/registry/schema.d.ts')
    this.registry = file.getInterfaceOrThrow('Registry')
    this.type = this.registry.getType()
  }

  private file(path: string) {
    return this.project.addSourceFileAtPath(path)
  }

  private async loadRoutes() {
    const { routes } = await import(join(this.rootPath, '.adonisjs/client/registry/index.ts'))
    const context = this.context()

    this.routes = Object.entries(routes as Record<string, RouteInfo>)
      .map(([name, info]) => {
        const types = context.propType([name, 'types'])
        return new Route(name, info, this.context(types), this.options.meta)
      })
  }

  private toDocument(): OpenAPIV3_1.Document {
    return {
      openapi: '3.1.0',
      info: { title: 'API Reference', version: '0.0.0' },
      components: {
        schemas: this.components.toSchemas(),
      },
      paths: this.paths,
    }
  }

  private validateRoute(route: Route) {
    if (this.config.routes === true) return true

    if (this.config.routes === 'auto') {
      const method = route.data.methods[0]!

      return this.options.meta.get(method, route.data.pattern)?.summary !== undefined
    }

    if (this.config.routes.include) {
      return this.config.routes.include.includes(route.data.pattern)
    }

    if (this.config.routes.exclude) {
      return !this.config.routes.exclude.includes(route.data.pattern)
    }

    return true
  }

  private async processRoute(route: Route) {
    if (!this.validateRoute(route)) return

    const [schema, error] = await catchError(route.toPathItem())

    if (error) {
      throw new Error(`Failed to generated openapi for route: ${route.data.pattern}`, { cause: error })
    }

    const data = this.paths[route.path] ?? {}
    Object.assign(data, schema)

    if (!this.paths[route.path]) this.paths[route.path] = data
  }
}
