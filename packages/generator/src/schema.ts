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

export function mergeSchemas(...schemas: SchemaObject[]): SchemaObject {
  return schemas.reduce((result, { type, ...schema }) => {
    result = defu(schema, result) as SchemaObject
    const types = uniq(toArray(result.type).concat(toArray(type)))
    result.type = types.length === 1 ? types[0] : types

    return result
  }, {})
}

/**
 * Compares schemas behind component references, see `Component.toOpenAPI`.
 * Empty schemas are compared as is, components still being resolved are empty too.
 */
function isSameSchema(a: SchemaObject, b: SchemaObject) {
  const rawA = '$raw' in a ? a.$raw as SchemaObject : a
  const rawB = '$raw' in b ? b.$raw as SchemaObject : b

  if (!Object.keys(rawA).length || !Object.keys(rawB).length) return equal(a, b)

  return equal(rawA, rawB)
}

export function normalizeSchemas(schemas: SchemaObject[]) {
  return schemas.reduce<SchemaObject[]>((result, schema) => {
    // members serialized the same collapse into one, e.g. MultipartFile | File | Blob
    if (result.some((item) => isSameSchema(item, schema))) {
      return result
    }

    const index = isPrimitive(schema)
      ? result.findIndex((item) => isPrimitive(item))
      : -1

    if (index !== -1) {
      result[index] = mergeSchemas(result[index]!, schema)
    } else {
      result.push(schema)
    }

    return result
  }, [])
}
