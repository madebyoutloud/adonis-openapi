import type { VineValidator } from '@vinejs/vine'
import { ApiQuery } from 'openapi-metadata/decorators'
import type { OpenAPIV3 } from 'openapi-types'
import { VineParser } from '../loaders/vine.js'

type ApiQueryOptions = Parameters<typeof ApiQuery>[0]

type ApiQueriesOptions = {
  type: () => VineValidator<any, any>
}

export function ApiQueries(list: ApiQueryOptions[]): MethodDecorator
// eslint-disable-next-line @typescript-eslint/unified-signatures
export function ApiQueries(options: ApiQueriesOptions): MethodDecorator
export function ApiQueries(options: ApiQueriesOptions | ApiQueryOptions[]): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    let list: Omit<OpenAPIV3.ParameterObject, 'in' | 'schema'>[]

    if (Array.isArray(options)) {
      list = options
    } else {
      list = new VineParser(options.type())
        .toQuery()
    }

    for (const item of list) {
      ApiQuery(item)(target, propertyKey)
    }
  }
}
