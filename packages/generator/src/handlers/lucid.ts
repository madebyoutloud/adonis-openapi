import type TsMorph from 'ts-morph'
import type { LucidModel } from '@adonisjs/lucid/types/model'
import type { Handler, SchemaObject } from '../types.ts'
import { Reference } from '../reference.ts'
import type { Context } from '../context.ts'

const relationRegex = /typeof import\((?:'|")([^'"]+)(?:'|")\)\.(\w+)/
const arrayRelationTypes = ['hasMany', 'manyToMany', 'hasManyThrough']

export class LucidHandler implements Handler {
  isLucidRow(type: TsMorph.Type) {
    return Reference.try(type.getText())
      ?.test('LucidRow', /@adonisjs\/lucid/) ?? false
  }

  test(type: TsMorph.Type, context: Context) {
    return type.isClass() && !!context.findBase(type, this.isLucidRow)
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
    await Promise.all(this.Model.$columnsDefinitions.keys().map((name) => this.column(name)))
    await Promise.all(this.Model.$computedDefinitions.keys().map((name) => this.column(name, true)))
    await Promise.all(this.Model.$relationsDefinitions.keys().map((name) => this.relation(name)))

    if (this.properties.length) this.schema.properties = Object.fromEntries(this.properties)
    if (this.required.length) this.schema.required = this.required

    return this.schema
  }

  private async column(name: string, computed = false) {
    const prop = this.context.property(name, this.type)
    const serializeName = this.naming.serializedName(this.Model, name)

    this.properties.push([serializeName, await this.context.child(prop.type).toSchema()])

    if (!computed || !this.context.isOptional(prop.prop)) {
      this.required.push(serializeName)
    }
  }

  private async relation(name: string) {
    const prop = this.context.property(name, this.type)
    const referenceType = prop.type.getNonNullableType()
    const match = referenceType.getText().match(relationRegex)

    if (!match) return

    const [,path, importName] = match

    const contract = this.Model.$getRelation(name)
    contract.type

    const file = this.context.file(`${path}.ts`)
    const type = file.getClass(importName)?.getType()

    if (!type) return

    let schema = await this.context.child(type).toSchema()

    if (arrayRelationTypes.includes(contract.type)) {
      schema = { type: 'array', items: schema }
    } else if (prop.type.isNullable()) {
      schema = { oneOf: [schema, { type: 'null' }] }
    }

    const serializeName = this.naming.serializedName(this.Model, name)
    this.properties.push([serializeName, schema])
  }
}
