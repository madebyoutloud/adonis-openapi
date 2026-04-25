import defu from 'defu'
import { toArray, uniq } from '@outloud/utils'
import equal from 'fast-deep-equal'
import { primitiveTypes } from './constants.ts'
import type { SchemaObject, SchemaObjectType } from './types.ts'

export function isPrimitive(schema: SchemaObject | SchemaObjectType): boolean {
  const type = typeof schema === 'object' ? schema.type : schema

  if (Array.isArray(type)) {
    return type.some((item) => isPrimitive(item))
  }

  return typeof type === 'string' && primitiveTypes.includes(type)
}

export function mergeSchema(schema: SchemaObject, { type, ...other }: SchemaObject): SchemaObject {
  const result = defu(other, schema) as SchemaObject
  const types = uniq(toArray(result.type).concat(toArray(type!)))
  result.type = types.length === 1 ? types[0] : types

  return result
}

export function mergeSchemas(schemas: SchemaObject[]) {
  return schemas.reduce<SchemaObject[]>((result, schema) => {
    const index = isPrimitive(schema)
      ? result.findIndex((item) => isPrimitive(item))
      : -1

    if (index !== -1) {
      result[index] = mergeSchema(result[index]!, schema)
    } else if (!result.some((item) => equal(item, schema))) {
      result.push(schema)
    }

    return result
  }, [])
}
