import type { Handler, SchemaObjectType } from './types.ts'

import { LucidHandler, LucidPaginatorHandler } from './handlers/lucid.ts'

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
  {
    // global File and Blob, part of the VineJS file input type
    text: /^(?:File|Blob)$/,
    test: (type) => type.getSymbol()?.getDeclarations()
      .some((item) => /\/(?:@types\/node|typescript\/lib)\//.test(item.getSourceFile().getFilePath())) ?? false,
    schema: () => ({ type: 'string', format: 'binary' }),
  },
  {
    path: /\/@boringnode\/encryption/,
    name: 'CypherText',
    schema: () => ({ type: 'string' }),
  },
  new LucidPaginatorHandler(),
  new LucidHandler(),
]
