import type { OpenAPIV3_1 } from 'openapi-types'
import type { Reference } from './reference.ts'
import type { SchemaObject } from './types.ts'

export class Component {
  name?: string
  promise?: Promise<any>

  constructor(public reference: Reference, public schema: SchemaObject) {}

  toOpenAPI() {
    const schema = {
      toJSON: () => this.toRef(),
    } as any as OpenAPIV3_1.ReferenceObject

    Object.defineProperty(schema, '$raw', {
      enumerable: false,
      get: () => this.schema,
    })

    return schema
  }

  toRef(): OpenAPIV3_1.ReferenceObject {
    return {
      $ref: `#/components/schemas/${this.name}`,
    }
  }
}
