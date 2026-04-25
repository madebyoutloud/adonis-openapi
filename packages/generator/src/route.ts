import type { OpenAPIV3_1 } from 'openapi-types'
import equal from 'fast-deep-equal'
import type { Context } from './context.ts'
import type { Reference } from './reference.ts'
import type { RouteSchemaType, SchemaObject } from './types.ts'
import type { Component } from './component.ts'

interface RouteData {
  methods: string[]
  pattern: string
}

const routeType = {
  body: /^[a-zA-Z<]*\(typeof import\((?:'|")([^']+)(?:'|")\)\.(\w+)\)[a-zA-Z>]*$/,
  response: /^[a-zA-Z<]*import\((?:'|")([^']+)(?:'|")\)\.default\[(?:'|")(\w+)(?:'|")\][a-zA-Z>]*$/,
}

export class Route {
  constructor(public name: string, public data: RouteData, private context: Context) {

  }

  get path() {
    return this.data.pattern.replace(/:(\w+)\??/g, '{$1}')
  }

  getReference(type: RouteSchemaType): Reference | undefined {
    const prop = this.context.property(type)
    const text = prop.node.getText()
    const prefix = `${type}: `

    if (!text.startsWith(prefix)) return

    const match = text.substring(prefix.length).match(routeType[type])

    if (!match) return

    const path = match[1]!
    let name = match[2]!

    switch (type) {
      case 'body':
        name = name.replace(/Validator$/, '') + 'Props'
        break
      case 'response':
        name += 'Response'
        break
    }

    return this.context.ref(name, path, type === 'response' ? 1 : 0)
  }

  async resolve(type: RouteSchemaType): Promise<{ schema: SchemaObject, component?: Component }> {
    const prop = this.context.property(type)
    const reference = this.getReference(type)

    if (!reference) return { schema: await this.context.toSchema(prop.type) }

    return await this.context.withRef(reference, () => this.context.toSchema(prop.type))
  }

  async toOperation(): Promise<OpenAPIV3_1.OperationObject> {
    const parameters = await this.getParameters()
    const requestBody = await this.getRequestBody()
    const responses = await this.getResponses()

    const result: OpenAPIV3_1.OperationObject = {}

    if (parameters.length) result.parameters = parameters
    if (requestBody) result.requestBody = requestBody
    if (responses) result.responses = responses

    return result
  }

  async toPathItem(): Promise<OpenAPIV3_1.PathItemObject> {
    const operation = await this.toOperation()

    const methods = this.data.methods.slice(0)
    if (methods.includes('GET') && methods.includes('HEAD')) {
      methods.splice(methods.indexOf('HEAD'), 1)
    }

    return Object.fromEntries(methods.map((method) => {
      return [method.toLowerCase(), operation]
    }))
  }

  private async getRequestBody(): Promise<OpenAPIV3_1.RequestBodyObject | undefined> {
    const { type } = this.context.property('body')
    if (type.isObject() && type.getProperties().length === 0) return

    const data = await this.resolve('body')
    const contentType = this.detectContentType(data.schema)

    return {
      required: true,
      content: {
        [contentType]: {
          schema: data.component?.toOpenapi() ?? data.schema,
        },
      },
    }
  }

  private async getResponses(): Promise<OpenAPIV3_1.ResponsesObject | undefined> {
    const { type } = this.context.property('response')
    if (type.isUnknown()) return

    const data = await this.resolve('response')

    return {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: data.component?.toOpenapi() ?? data.schema,
          },
        },
      },
    }
  }

  private getPathParameters(): OpenAPIV3_1.ParameterObject[] {
    const names = [...this.data.pattern.matchAll(/:(\w+)/g)].map((item) => item[1]!)
    return names.map<OpenAPIV3_1.ParameterObject>((name) => ({
      name: name.replace(/\?$/, ''),
      in: 'path',
      required: !name.endsWith('?'),
      schema: { type: ['string', 'integer'] } as any,
    }))
  }

  private mergeQuery(parameter: OpenAPIV3_1.ParameterObject, schema: SchemaObject) {
    if (equal(parameter.schema, schema)) return

    if (parameter.schema && 'oneOf' in parameter.schema) {
      parameter.schema.oneOf?.push(schema as any)
    } else {
      parameter.schema = {
        oneOf: [parameter.schema, schema] as any,
      }
    }
  }

  private async getQuery(): Promise<OpenAPIV3_1.ParameterObject[]> {
    const query = this.context.property('query')
    const result: OpenAPIV3_1.ParameterObject[] = []

    for (const type of this.context.unionToArray(query.type)) {
      const schema = await this.context.toSchema(type)

      for (const [name, data] of Object.entries(schema.properties ?? {})) {
        const param = result.find((item) => item.name === name)

        if (param) {
          this.mergeQuery(param, data)
        } else {
          result.push({
            name,
            in: 'query',
            required: schema.required?.includes(name) ?? false,
            schema: data as any,
          })
        }
      }
    }

    return result
  }

  private async getParameters(): Promise<OpenAPIV3_1.ParameterObject[]> {
    return [...this.getPathParameters(), ...(await this.getQuery())]
  }

  private detectContentType(body: OpenAPIV3_1.SchemaObject) {
    const schemas = (body.oneOf ? body.oneOf : [body])

    for (const schema of schemas) {
      const properties = 'properties' in schema ? schema.properties ?? {} : {}
      const hasBinary = Object.values(properties)
        .some((item) => {
          const prop = '$raw' in item ? item.$raw as SchemaObject : item
          return 'type' in prop && prop.type === 'string' && prop.format === 'binary'
        })

      if (hasBinary) return 'multipart/form-data'
    }

    return 'application/json'
  }
}
