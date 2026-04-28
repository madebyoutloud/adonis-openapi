import type TsMorph from 'ts-morph'
import type { ComputedOptions, LucidModel, ModelColumnOptions } from '@adonisjs/lucid/types/model'
import type { RelationshipsContract } from '@adonisjs/lucid/types/relations'
import type { Handler, SchemaObject } from '../types.ts'
import { Reference } from '../reference.ts'
import type { Context } from '../context.ts'

const relationRegex = /typeof import\((?:'|")([^'"]+)(?:'|")\)\.(\w+)/
const arrayRelationTypes = ['hasMany', 'manyToMany', 'hasManyThrough']

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

    if (this.properties.length) this.schema.properties = Object.fromEntries(this.properties)
    if (this.required.length) this.schema.required = this.required

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
    const referenceType = prop.type.getNonNullableType()
    const match = referenceType.getText().match(relationRegex)

    if (!match) return

    const [,path, importName] = match

    const file = this.context.file(`${path}.ts`)
    const type = file.getClass(importName)?.getType()

    if (!type) return

    let schema = await this.context.child(type).toSchema()

    if (arrayRelationTypes.includes(options.type)) {
      schema = { type: 'array', items: schema }
    } else if (prop.type.isNullable()) {
      schema = { oneOf: [schema, { type: 'null' }] }
    }

    const serializeName = this.naming.serializedName(this.Model, name)
    this.properties.push([serializeName, schema])
  }
}
