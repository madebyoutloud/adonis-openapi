import type { Handler, SchemaObjectType } from './types.ts'

import { LucidHandler } from './handlers/lucid.ts'

export const primitiveTypes: SchemaObjectType[] = [
  'boolean',
  'integer',
  'null',
  'number',
  'string',
]

export const methodsWithBody = ['POST', 'PUT', 'PATCH', 'DELETE']

export const defaultHandlers: Handler[] = [
  {
    text: /^luxon\.DateTime<[^>]+>$/,
    schema: () => ({ type: 'string' }),
  },
  {
    path: /\/@adonisjs\/bodyparser/,
    name: 'MultipartFile',
    schema: () => ({ type: 'string', format: 'binary' }),
  },
  new LucidHandler(),
]
