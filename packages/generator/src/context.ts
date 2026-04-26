import { fileURLToPath } from 'node:url'
import type TsMorph from 'ts-morph'
import type { FunctionDeclaration, Project } from 'ts-morph'
import type { MaybePromise, Resolver, SchemaObject } from './types.ts'
import type { Components } from './components.ts'
import { Reference } from './reference.ts'
import { Component } from './component.ts'
import type { Handlers } from './handlers.ts'
import { mergeSchemas } from './schema.ts'

interface ContextData {
  components: Components
  node: TsMorph.Node
  handlers: Handlers
  root: string
  project: Project
  resolve: Resolver
}

const maxDepth = 10

export class Context {
  constructor(public type: TsMorph.Type, private data: ContextData, private depth = 0) {

  }

  child(type: TsMorph.Type) {
    return new Context(type, this.data, this.depth + 1)
  }

  file(path: string) {
    return this.data.project.addSourceFileAtPath(path)
  }

  property(path: string | string[], parent: TsMorph.Type = this.type): {
    prop: TsMorph.Symbol
    node: TsMorph.Node
    type: TsMorph.Type
  } {
    const prop = parent.getPropertyOrThrow(Array.isArray(path) ? path[0] : path)
    const node = prop.getValueDeclarationOrThrow()
    const type = node.getType()

    if (Array.isArray(path) && path.length > 1) {
      return this.property(path.slice(1), type)
    }

    return {
      prop,
      node,
      type,
    }
  }

  propType(path: string | string[] | TsMorph.Symbol, parent: TsMorph.Type = this.type) {
    if (Array.isArray(path) || typeof path === 'string') {
      return this.property(path, parent).type
    }

    return path.getValueDeclarationOrThrow().getType()
  }

  component(reference: Reference): Component | undefined
  component(reference: Reference, value: Component): Component
  component(reference: Reference, value?: Component) {
    if (value) {
      this.data.components.set(reference.key, value)
      return value
    }

    return this.data.components.get(reference.key)
  }

  tryRef(type: TsMorph.Type) {
    const data = Reference.test(type.getText())

    if (data) return this.ref(data.name, data.path)
  }

  ref(name: string, path: string, initial?: number) {
    path = fileURLToPath(this.data.resolve(path, this.data.root))

    return new Reference(name, path, initial)
  }

  async withRef(reference: Reference, cb: () => MaybePromise<SchemaObject>) {
    let component = this.component(reference)

    if (!component) {
      component = this.component(reference, new Component(reference, {}))
      component.promise = Promise.resolve(cb())

      component.schema = await component.promise
      component.promise = undefined
    }

    // do not await component.promise, as it might create deadlock, when two models reference each other

    return {
      schema: component.schema,
      component,
    }
  }

  unionToArray(type: TsMorph.Type) {
    return type.isUnion() ? type.getUnionTypes() : [type]
  }

  isOptional(prop: TsMorph.Symbol) {
    if (prop.isOptional()) return true

    const type = prop.getValueDeclaration()?.getType() ?? prop.getTypeAtLocation(this.data.node)

    if (!type.isUnion()) return type.isUndefined()

    return type.getUnionTypes().some((item) => item.isUndefined())
  }

  isSerializable(type: TsMorph.Type) {
    return !type.isUndefined() &&
      !type.isNever() &&
      type.getCallSignatures().length === 0
  }

  async toSchema(type = this.type): Promise<SchemaObject> {
    const reference = Reference.try(type.getText())

    if (!type.isUnion() && reference) {
      const data = await this.withRef(reference, () => this.$toSchema(type))

      return data.component.toOpenAPI()
    }

    return await this.$toSchema(type)
  }

  // eslint-disable-next-line complexity
  private async $toSchema(type: TsMorph.Type): Promise<SchemaObject> {
    if (type.isUnion()) return this.unionToSchema(type)

    const handler = this.data.handlers.match(type, this)
    if (handler) return handler.schema(type, this)

    if (type.isEnum()) console.log('ENUM')

    if (type.isNumber() || type.isNumberLiteral()) return { type: 'number' }
    if (type.isBoolean() || type.isBooleanLiteral()) return { type: 'boolean' }
    if (type.isStringLiteral()) return { type: 'string', enum: [type.getLiteralValue()] }
    if (type.isString()) return { type: 'string' }
    if (type.isAny() || type.isUnknown()) return { type: 'object' }
    if (type.isNull()) return { type: 'null' }

    if (type.isArray()) return this.arrayToSchema(type)

    if (type.isObject()) return this.objectToSchema(type)

    return { type: 'null' }
  }

  async unionToSchema(type: TsMorph.Type): Promise<SchemaObject> {
    const schemas = await Promise.all(
      type.getUnionTypes()
        .filter((item) => this.isSerializable(item))
        .map((item) => this.toSchema(item)),
    )

    if (!schemas.length) return { type: 'null' }

    const merged = mergeSchemas(schemas)

    if (merged.length === 1) return merged[0]

    return { oneOf: merged }
  }

  jsonToSchema(symbol: TsMorph.Symbol): Promise<SchemaObject> {
    const declaration = symbol.getValueDeclarationOrThrow() as FunctionDeclaration
    return this.toSchema(declaration.getReturnType())
  }

  async arrayToSchema(type: TsMorph.Type): Promise<SchemaObject> {
    if (this.depth >= maxDepth) return { type: 'array', items: { type: 'object' } }

    return {
      type: 'array',
      items: await this.child(type.getArrayElementTypeOrThrow()).toSchema(),
    }
  }

  findBase(type: TsMorph.Type, where: (type: TsMorph.Type) => boolean): TsMorph.Type | undefined {
    const items = type.getBaseTypes()

    for (const item of items) {
      if (where(item)) {
        return item
      }

      const parent = this.findBase(item, where)
      if (parent) return parent
    }
  }

  async objectToSchema(type: TsMorph.Type): Promise<SchemaObject> {
    const toJSON = type.getProperty('toOpenAPI') ?? type.getProperty('toJSON')
    if (toJSON) return this.jsonToSchema(toJSON)

    const result: SchemaObject = { type: 'object' }

    if (this.depth >= maxDepth) return result

    const required: string[] = []

    const rawProperties = type.getProperties()
      .map((item) => {
        const propType = item.getValueDeclaration()?.getType() ?? item.getTypeAtLocation(this.data.node)

        return [item, propType] as const
      })
      .filter(([,propType]) => this.isSerializable(propType))

    if (rawProperties.length) {
      result.properties = Object.fromEntries(await Promise.all(rawProperties.map(async ([prop, propType]) => {
        const name = prop.getName()

        if (!this.isOptional(prop)) required.push(name)

        return [name, await this.child(propType).toSchema()]
      })))
    }

    if (required.length) result.required = required

    return result
  }
}
