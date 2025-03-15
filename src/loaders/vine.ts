import type { TypeLoaderFn } from 'openapi-metadata'
import { VineValidator } from '@vinejs/vine'
import type { OpenAPIV3 } from 'openapi-types'
import type { ApiQuery } from 'openapi-metadata/decorators'
import { extractNameFromThunk } from '../utils.js'

type Validator = ReturnType<VineValidator<any, any>['toJSON']>
type Schema = Validator['schema']
type Refs = Validator['refs']
type CompilerNode = Validator['schema']['schema']
type ObjectNode = CompilerNode & { type: 'object' }
type LiteralNode = CompilerNode & { type: 'literal' }
type ArrayNode = CompilerNode & { type: 'array' }
type RecordNode = CompilerNode & { type: 'record' }

type QueryOptions = Parameters<typeof ApiQuery>[0]

export const VineTypeLoader: TypeLoaderFn = async (context, value, original) => {
  if (!(value instanceof VineValidator)) {
    return
  }

  if (original === value) {
    context.logger.warn(`Vine Validators can only be loaded using Thunk '() => myValidator'`)
    return
  }

  const name = extractNameFromThunk(original as Function)
  if (!name) {
    context.logger.warn(`Cannot extract Validator name from Thunk`)
    return
  }

  if (!context.schemas[name]) {
    const schema = new VineParser(value)
      .toSchema()
    context.schemas[name] = schema

    return schema
  }

  return { $ref: `#/components/schemas/${name}` }
}

export class VineParser {
  private schema: Schema
  private refs: Refs

  constructor(validator: VineValidator<any, any>) {
    const json = validator.toJSON()
    this.schema = json.schema
    this.refs = json.refs
  }

  parseCompilerNode(node: CompilerNode): OpenAPIV3.SchemaObject {
    const schema: OpenAPIV3.SchemaObject = {}

    if ('allowNull' in node && node.allowNull) {
      schema.nullable = true
    }

    switch (node.type) {
      case 'object':
        Object.assign(schema, this.parseObjectNode(node))
        break
      case 'literal':
        Object.assign(schema, this.parseLiteralNode(node))
        break
      case 'array':
        Object.assign(schema, this.parseArrayNode(node))
        break
      case 'record':
        Object.assign(schema, this.parseRecordNode(node))
        break
      default:
        console.warn(`No parser found for type ${node.type}`)
        schema.type = 'object'
        break
    }

    return schema
  }

  parseObjectNode(node: ObjectNode): OpenAPIV3.SchemaObject {
    const schema: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: {},
      nullable: node.allowNull,
    }

    const required = []

    for (const property of node.properties) {
      schema.properties![property.fieldName] = this.parseCompilerNode(property)

      if ('isOptional' in property && !property.isOptional) {
        required.push(property.fieldName)
      }
    }

    if (required.length) {
      schema.required = required
    }

    return schema
  }

  parseArrayNode(node: ArrayNode): OpenAPIV3.SchemaObject {
    return {
      type: 'array',
      items: this.parseCompilerNode(node.each),
    }
  }

  private getNodeRefs(node: LiteralNode) {
    return node.validations.map((item) => {
      return this.refs[item.ruleFnId]
    })
  }

  private getNodeValidators(node: LiteralNode) {
    return this.getNodeRefs(node)
      .filter((item) => 'validator' in item)
  }

  parseLiteralNode(node: LiteralNode): OpenAPIV3.SchemaObject {
    const subtype = 'subtype' in node ? node.subtype : 'string'

    switch (subtype) {
      case 'number':
        return this.parseNumberNode(node)
      case 'boolean':
        return {
          type: 'boolean',
        }
      case 'enum':
        return this.parseEnumNode(node)
      default:
        return {
          type: 'string',
        }
    }
  }

  parseNumberNode(node: LiteralNode): OpenAPIV3.SchemaObject {
    const validators = this.getNodeValidators(node)
    const min = validators.find((item) => item.options?.min)?.options?.min
    const max = validators.find((item) => item.options?.max)?.options?.max

    return {
      type: 'number',
      minimum: min,
      maximum: max,
    }
  }

  parseEnumNode(node: LiteralNode): OpenAPIV3.SchemaObject {
    const validator = this.getNodeValidators(node)
      .find((item) => item.options?.choices)

    return {
      enum: validator?.options?.choices ?? [],
    }
  }

  parseRecordNode(_node: RecordNode): OpenAPIV3.SchemaObject {
    return {
      type: 'object',
    }
  }

  pathToName(path: string[]) {
    const [first, ...rest] = path

    return first + rest.map((item) => `[${item}]`)
  }

  toSchema(): OpenAPIV3.SchemaObject {
    const node = this.schema.schema

    if (node.type !== 'object') {
      // TODO: Better errors
      throw new Error('Only object top-level schemas are currently supported')
    }

    return this.parseCompilerNode(node)
  }

  toQuery(schema = this.toSchema(), path: string[] = [], required = false): QueryOptions[] {
    if (schema.type === 'object') {
      return Object.entries(schema.properties ?? {})
        .flatMap(([key, value]) => {
          return this.toQuery(
            value as OpenAPIV3.SchemaObject,
            [...path, key],
            schema.required?.includes(key) ?? false,
          )
        })
    }

    return [
      {
        schema,
        required,
        name: this.pathToName(path),
      },
    ]
  }
}
