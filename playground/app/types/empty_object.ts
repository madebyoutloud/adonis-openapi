import type { Handler } from '@outloud/adonis-openapi-generator'

/**
 * The body `{}`. Its schema comes from `emptyObjectHandler`.
 */
export type EmptyObject = Record<string, never>

export const emptyObjectHandler: Handler = {
  test: (type) => type.getAliasSymbol()?.getName() === 'EmptyObject',
  schema: () => ({ type: 'object', additionalProperties: false }),
}
