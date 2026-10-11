import { join } from 'node:path'
import type TsMorph from 'ts-morph'
import type { LucidModel } from '@adonisjs/lucid/types/model'
import type { SimplePaginatorMetaKeys } from '@adonisjs/lucid/types/querybuilder'
import type { Handler, SchemaObject } from '../types.ts'
import { Reference } from '../reference.ts'
import type { Context } from '../context.ts'

/**
 * Keys of `CamelCaseNamingStrategy`, the Lucid default.
 */
const defaultMetaKeys: SimplePaginatorMetaKeys = {
  total: 'total',
  perPage: 'perPage',
  currentPage: 'currentPage',
  lastPage: 'lastPage',
  firstPage: 'firstPage',
  firstPageUrl: 'firstPageUrl',
  lastPageUrl: 'lastPageUrl',
  nextPageUrl: 'nextPageUrl',
  previousPageUrl: 'previousPageUrl',
}

const metaSchemas: Record<keyof SimplePaginatorMetaKeys, SchemaObject> = {
  total: { type: 'number' },
  perPage: { type: 'number' },
  currentPage: { type: 'number' },
  lastPage: { type: 'number' },
  firstPage: { type: 'number' },
  firstPageUrl: { type: 'string' },
  lastPageUrl: { type: 'string' },
  nextPageUrl: { type: ['string', 'null'] },
  previousPageUrl: { type: ['string', 'null'] },
}

/**
 * Result of `Model.query().paginate()`, typed as `{ meta: any, data: ModelObject[] }`
 * by Lucid. Meta keys come from the model naming strategy.
 */
export class LucidPaginatorHandler implements Handler {
  test(type: TsMorph.Type) {
    const symbol = type.getSymbol()

    return symbol?.getName() === 'ModelPaginatorContract' && symbol.getDeclarations()
      .some((item) => /\/@adonisjs\/lucid\//.test(item.getSourceFile().getFilePath()))
  }

  async schema(type: TsMorph.Type, context: Context): Promise<SchemaObject> {
    const [rowType] = type.getTypeArguments()
    if (!rowType) return { type: 'object' }

    const ref = context.tryRef(rowType)
    const Model: LucidModel | undefined = ref && await ref.load()
    const keys = Model?.namingStrategy.paginationMetaKeys() ?? defaultMetaKeys

    const meta = Object.entries(metaSchemas)
      .map(([key, schema]) => [keys[key as keyof SimplePaginatorMetaKeys], schema] as const)

    // one component per naming strategy, named `PaginatorMeta` unless strategies collide,
    // then prefixed with the strategy, e.g. `SnakeCasePaginatorMeta`
    const strategy = Model?.namingStrategy.constructor.name ?? 'CamelCaseNamingStrategy'
    const variant = strategy.replace(/NamingStrategy$/, '') || 'Custom'
    const reference = new Reference('PaginatorMeta', join(context.root, variant))

    const { component } = await context.withRef(reference, () => ({
      type: 'object',
      properties: Object.fromEntries(meta),
      required: meta.map(([key]) => key).toSorted(),
    }))

    return {
      type: 'object',
      properties: {
        meta: component.toOpenAPI(),
        data: {
          type: 'array',
          items: await context.child(rowType).toSchema(),
        },
      },
      required: ['data', 'meta'],
    }
  }
}
