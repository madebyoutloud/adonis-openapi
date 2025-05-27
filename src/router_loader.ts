import type { Logger } from '@adonisjs/core/logger'
import type { HttpRouterService } from '@adonisjs/core/types'
import type { RouteJSON } from '@adonisjs/core/types/http'
import { OperationMetadataStorage, OperationParameterMetadataStorage } from 'openapi-metadata/metadata'
import type { OpenAPIV3 } from 'openapi-types'
import { isConstructor } from './utils.js'
import type { OpenAPIConfig } from './types.js'

export class RouterLoader {
  constructor(
    private router: HttpRouterService,
    private logger: Logger,
    private config: OpenAPIConfig['router'],
  ) {}

  async importController(route: RouteJSON): Promise<[Function, string] | undefined> {
    const handler = route.handler
    if (typeof handler === 'function') {
      return
    }

    const reference = handler.reference
    if (typeof reference === 'string') {
      this.logger.warn('Magic strings controllers are not supported yet')
      return
    }

    let construct = reference[0] as Function
    const propertyKey = reference[1] ?? 'handle'

    if (propertyKey === 'handle') {
      return
    }

    // For lazy imports
    if (!isConstructor(construct)) {
      construct = await construct()
        .then((m: any) => m.default)
    }

    return [construct, propertyKey]
  }

  async detect(route: RouteJSON, reference: [Function, string]) {
    const [target, propertyKey] = reference
    const metadata = OperationMetadataStorage.getMetadata(target.prototype, propertyKey)
    const hasMetadata = Object.keys(metadata).length > 0

    if (!hasMetadata && this.config.detect === 'auto') {
      return
    }

    // already has metadata
    if (metadata.path) {
      return
    }

    OperationMetadataStorage.mergeMetadata(
      target.prototype,
      {
        path: route.pattern,
        methods: route.methods.filter((m) => m !== 'HEAD')
          .map((r) => r.toLowerCase()) as any,
        // tags: [name],
      },
      propertyKey,
    )

    if (!this.config.params) {
      return
    }

    const params = route.pattern.match(/:(\w+)/g) ?? []

    OperationParameterMetadataStorage.mergeMetadata(
      target.prototype,
      params.map((item) => {
        const name = item.slice(1)

        return {
          in: 'path',
          required: true,
          name,
          ...this.detectParamType(name, route),
        }
      }),
      propertyKey,
    )
  }

  private detectParamType(name: string, route: RouteJSON) {
    let type: OpenAPIV3.NonArraySchemaObjectType = 'string'
    let format: string | undefined
    const matcher = route.matchers[name]

    const regex = matcher && matcher.match ? String(matcher.match) : null

    if (regex === String(this.router.matchers.number().match)) {
      type = 'number'
    } else if (regex === String(this.router.matchers.uuid().match)) {
      format = 'uuid'
    }

    return {
      type,
      format,
    }
  }

  async load(): Promise<Function[]> {
    const controllers = new Set<Function>()

    const routerJson = this.router.toJSON()
    const routes = Object.values(routerJson)
      .flat()

    for (const route of routes) {
      const controller = await this.importController(route)

      if (!controller) {
        continue
      }

      controllers.add(controller[0])

      if (this.config.detect) {
        await this.detect(route, controller)
      }
    }

    return [...controllers]
  }
}
