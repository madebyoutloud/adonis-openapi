import type { OpenAPIV3_1 } from 'openapi-types'
import type TsMorph from 'ts-morph'
import type { Context } from './context.ts'

export type MaybePromise<T> = T | Promise<T>
export type SchemaObject = OpenAPIV3_1.SchemaObject
export type SchemaObjectType = OpenAPIV3_1.NonArraySchemaObjectType | OpenAPIV3_1.ArraySchemaObjectType

export type RouteSchemaType = 'body' | 'response'

export interface RouteInfo {
  methods: string[]
  pattern: string
}

export interface Handler {
  text?: RegExp | string
  path?: RegExp | string
  name?: RegExp | string
  test?: (type: TsMorph.Type, context: Context) => boolean
  schema: (type: TsMorph.Type, context: Context) => SchemaObject | Promise<SchemaObject>
}

export type Resolver = (specifier: string, parent?: string | URL) => string

export interface Meta {
  compute(): void
  get(method: string, path: string): OpenAPIV3_1.OperationObject | undefined
}

export interface GeneratorConfig {
  resolve: Resolver
  routes: true | 'auto' | {
    include?: string[]
    exclude?: string[]
  }
}

export interface GeneratorOptions {
  config: GeneratorConfig
  meta: Meta
}
