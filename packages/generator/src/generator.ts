import { join } from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { OpenAPIV3_1 } from 'openapi-types'
import type { Project } from 'ts-morph'
import type TsMorph from 'ts-morph'
import { Route } from './route.ts'
import { Context } from './context.ts'
import type { GeneratorOptions, Resolver, RouteInfo } from './types.ts'
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
      resolve: this.options.resolve,
    })
  }

  async generate() {
    await this.loadProject()
    await this.loadRoutes()

    for (const route of this.routes) {
      await this.processRoute(route)
    }

    await this.save()
  }

  private async save() {
    const document = this.toDocument()
    const json = JSON.stringify(document, null, this.options.debug ? 2 : 0)

    await fs.promises.writeFile(
      join(this.rootPath, '.adonisjs/openapi.json'),
      json,
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
        return new Route(name, info, this.context(types))
      })
  }

  private toDocument(): OpenAPIV3_1.Document {
    return {
      components: {
        schemas: this.components.toSchemas(),
      },
      openapi: '3.1.0',
      info: { title: 'AdonisJS API', version: '1.0.0' },
      servers: [{ url: 'http://localhost:3333' }],
      paths: this.paths,
    }
  }

  private async processRoute(route: Route) {
    const data = this.paths[route.path] ?? {}
    Object.assign(data, await route.toPathItem())

    if (!this.paths[route.path]) this.paths[route.path] = data
  }
}
