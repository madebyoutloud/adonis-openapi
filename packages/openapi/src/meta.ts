import type { Route } from '@adonisjs/core/http'
import type { OpenAPIV3_1 } from 'openapi-types'

export class Meta {
  private data = new Map<Route, OpenAPIV3_1.OperationObject>()
  private computed = new Map<string, OpenAPIV3_1.OperationObject>()

  set(key: Route, value: OpenAPIV3_1.OperationObject) {
    this.data.set(key, value)
  }

  merge(key: Route, value: OpenAPIV3_1.OperationObject) {
    this.data.set(key, { ...value, ...this.data.get(key) })
  }

  get(method: string, path: string) {
    return this.computed.get(`${method}:${path}`)
  }

  compute() {
    for (const [route, value] of this.data) {
      const serialized = route.toJSON()
      for (const method of serialized.methods) {
        this.computed.set(`${method}:${serialized.pattern}`, value)
      }
    }
  }
}

const meta = new Meta()
export { meta }
