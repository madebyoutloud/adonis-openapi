import type TsMorph from 'ts-morph'
import type { ComputedOptions, LucidModel, ModelColumnOptions } from '@adonisjs/lucid/types/model'
import type { RelationshipsContract } from '@adonisjs/lucid/types/relations'
import type { SimplePaginatorMetaKeys } from '@adonisjs/lucid/types/querybuilder'
import type { Handler, SchemaObject } from '../types.ts'
import { Reference } from '../reference.ts'
import type { Context } from '../context.ts'

export class LucidHandler implements Handler {
  isLucidRow(type: TsMorph.Type): boolean {
    if (!type.isClass()) return false

    const base = type.getBaseTypes()[0]
    if (!base) return false

    if (base.isIntersection()) {
      return base.getIntersectionTypes()
        .some((item) => this.isLucidRow(item))
    }

    const ref = Reference.try(base.getText())

    if (ref?.test('LucidRow', /@adonisjs\/lucid/)) {
      return true
    }

    return this.isLucidRow(base)
  }

  test(type: TsMorph.Type) {
    return this.isLucidRow(type)
  }

  async schema(type: TsMorph.Type, context: Context): Promise<SchemaObject> {
    const ref = context.tryRef(type)
    if (!ref) return { type: 'object' }

    return new LucidSerializer(await ref.load(), type, context).toSchema()
  }
}

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

    return {
      type: 'object',
      properties: {
        meta: {
          type: 'object',
          properties: Object.fromEntries(meta),
          required: meta.map(([key]) => key).toSorted(),
        },
        data: {
          type: 'array',
          items: await context.child(rowType).toSchema(),
        },
      },
      required: ['data', 'meta'],
    }
  }
}

class LucidSerializer {
  required: string[] = []
  properties: [string, SchemaObject][] = []
  schema: SchemaObject = { type: 'object' }

  constructor(
    public Model: LucidModel,
    public type: TsMorph.Type,
    public context: Context,
  ) {
  }

  get naming() {
    return this.Model.namingStrategy
  }

  async toSchema(): Promise<SchemaObject> {
    await Promise.all(this.Model.$columnsDefinitions.entries().map(([name, options]) => {
      return this.column(name, options)
    }))
    await Promise.all(this.Model.$computedDefinitions.entries().map(([name, options]) => {
      return this.column(name, options)
    }))
    await Promise.all(this.Model.$relationsDefinitions.entries().map(([name, options]) => {
      return this.relation(name, options)
    }))

    if (this.properties.length) {
      this.schema.properties = Object.fromEntries(this.properties)
    }

    if (this.required.length) this.schema.required = this.required.toSorted()

    return this.schema
  }

  private async column(name: string, options: ModelColumnOptions | ComputedOptions) {
    if (!options.serializeAs) return

    // const isComputed = 'columnName' in options
    const prop = this.context.property(name, this.type)

    this.properties.push([options.serializeAs, await this.context.child(prop.type).toSchema()])

    if (!this.context.isOptional(prop.prop)) {
      this.required.push(options.serializeAs)
    }
  }

  private async relation(name: string, options: RelationshipsContract) {
    if (!options.serializeAs) return

    const prop = this.context.property(name, this.type)
    const relationType = prop.type.getNonNullableType()
    let type: TsMorph.Type | undefined = relationType.getIntersectionTypes()[0]
    const isArray = type.isArray()

    if (isArray) {
      type = type.getArrayElementType()
    }

    if (!type) return

    let schema = await this.context.child(type).toSchema()

    if (isArray) {
      schema = { type: 'array', items: schema }
    } else if (prop.type.isNullable()) {
      schema = { oneOf: [schema, { type: 'null' }] }
    }

    const serializeName = this.naming.serializedName(this.Model, name)
    this.properties.push([serializeName, schema])
  }
}
