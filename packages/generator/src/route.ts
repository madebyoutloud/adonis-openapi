import type { OpenAPIV3_1 } from 'openapi-types'
import equal from 'fast-deep-equal'
import type { Context } from './context.ts'
import type { Reference } from './reference.ts'
import type { Meta, RouteSchemaType, SchemaObject } from './types.ts'
import type { Component } from './component.ts'

interface RouteData {
  methods: string[]
  pattern: string
}

const routeType = {
  body: /^[a-zA-Z<]*\(typeof import\((?:'|")([^']+)(?:'|")\)\.(\w+)\)[a-zA-Z>]*$/,
  response: /^[a-zA-Z<]*import\((?:'|")([^']+)(?:'|")\)\.default\[(?:'|")(\w+)(?:'|")\][a-zA-Z>]*$/,
}

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  307: 'Temporary Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  409: 'Conflict',
  410: 'Gone',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
}

interface PathVariant {
  path: string
  params: string[]
}

export class Route {
  /**
   * `types` is missing for routes outside of the registry,
   * those are documented by path parameters and metadata only.
   */
  constructor(
    public name: string,
    public data: RouteData,
    private types: Context | undefined,
    private meta: Meta,
  ) {

  }

  private get context(): Context {
    if (!this.types) throw new Error(`Route '${this.name}' has no types`)

    return this.types
  }

  /**
   * OpenAPI path parameters are always required, so every optional
   * parameter doubles the paths, e.g. `/posts/:id?` is documented
   * as both `/posts` and `/posts/{id}`.
   */
  get paths(): PathVariant[] {
    const segments = this.data.pattern.split('/')
    const optional = segments.filter((item) => /^:\w+\?$/.test(item))

    return Array.from({ length: 2 ** optional.length }, (_, mask) => {
      const included = segments.filter((item) => {
        const index = optional.indexOf(item)
        return index === -1 || (mask & (1 << index)) !== 0
      })

      return {
        path: included.join('/').replace(/:(\w+)\??/g, '{$1}') || '/',
        params: included.flatMap((item) => [...item.matchAll(/:(\w+)/g)].map((match) => match[1]!)),
      }
    })
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

  /**
   * Operation without path parameters, those differ per path variant.
   */
  async toOperation(): Promise<OpenAPIV3_1.OperationObject> {
    if (!this.types) return {}

    const parameters = await this.getQuery()
    const requestBody = await this.getRequestBody()
    const responses = await this.getResponses()

    const result: OpenAPIV3_1.OperationObject = {}

    if (parameters.length) result.parameters = parameters
    if (requestBody) result.requestBody = requestBody
    if (responses) result.responses = responses

    return result
  }

  async toPathItems(): Promise<Record<string, OpenAPIV3_1.PathItemObject>> {
    const operation = await this.toOperation()

    const methods = this.data.methods.slice(0)
    if (methods.includes('GET') && methods.includes('HEAD')) {
      methods.splice(methods.indexOf('HEAD'), 1)
    }

    return Object.fromEntries(this.paths.map(({ path, params }) => {
      const parameters = [...this.getPathParameters(params), ...(operation.parameters ?? [])]
      const pathOperation = parameters.length ? { ...operation, parameters } : operation

      return [
        path,
        Object.fromEntries(methods.map((method) => [
          method.toLowerCase(), {
            ...pathOperation,
            ...this.meta.get(method, this.data.pattern),
          },
        ])),
      ]
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
          schema: data.component?.toOpenAPI() ?? data.schema,
        },
      },
    }
  }

  private async getResponses(): Promise<OpenAPIV3_1.ResponsesObject | undefined> {
    // Prefer Tuyau's normalized `rawResponse` union ({ status; response } across
    // all status codes) so every documented response — 201/204 successes and
    // 4xx errors alike — is emitted with its real code and body.
    const responses = await this.getRawResponses()
    if (responses) return responses

    // Legacy fallback for registries generated before `rawResponse` existed:
    // a single 200 built from `response`.
    const { type } = this.context.property('response')
    if (type.isUnknown()) return

    const data = await this.resolve('response')

    return {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: data.component?.toOpenAPI() ?? data.schema,
          },
        },
      },
    }
  }

  private async getRawResponses(): Promise<OpenAPIV3_1.ResponsesObject | undefined> {
    let raw
    try {
      raw = this.context.property('rawResponse')
    } catch {
      return
    }

    if (raw.type.isUnknown()) return

    const node = this.context.node
    const byStatus = new Map<number, SchemaObject[]>()

    for (const member of this.context.unionToArray(raw.type)) {
      const statusSym = member.getProperty('status')
      if (!statusSym) continue

      // Read the INSTANTIATED literal via getTypeAtLocation — a value
      // declaration would return the generic parameter (`S`/`R`) from the
      // ExtractRawResponse definition instead of the concrete `201`/body.
      const statusType = statusSym.getTypeAtLocation(node)
      const responseSym = member.getProperty('response')
      const responseType = responseSym?.getTypeAtLocation(node)

      for (const status of this.context.unionToArray(statusType)) {
        if (!status.isNumberLiteral()) continue

        const code = status.getLiteralValue() as number
        if (!byStatus.has(code)) byStatus.set(code, [])

        if (responseType && this.isBodyfulResponse(responseType)) {
          byStatus.get(code)!.push(await this.context.toSchema(responseType))
        }
      }
    }

    if (!byStatus.size) return

    const responses: OpenAPIV3_1.ResponsesObject = {}

    for (const [code, schemas] of byStatus) {
      const response: OpenAPIV3_1.ResponseObject = { description: STATUS_TEXT[code] ?? String(code) }

      if (schemas.length === 1) {
        response.content = { 'application/json': { schema: schemas[0] as any } }
      } else if (schemas.length > 1) {
        response.content = { 'application/json': { schema: { oneOf: schemas } as any } }
      }

      responses[code] = response
    }

    return responses
  }

  private isBodyfulResponse(type: Context['type']): boolean {
    if (type.isUnknown() || type.isNever() || type.isVoid() || type.isUndefined()) return false
    if (type.isObject() && !type.isArray() && type.getProperties().length === 0) return false
    return true
  }

  private getPathParameters(names: string[]): OpenAPIV3_1.ParameterObject[] {
    return names.map<OpenAPIV3_1.ParameterObject>((name) => ({
      name,
      in: 'path',
      required: true,
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

    return result.toSorted((a, b) => a.name.localeCompare(b.name))
  }

  private detectContentType(body: OpenAPIV3_1.SchemaObject) {
    const schemas = (body.oneOf ? body.oneOf : [body])

    for (const schema of schemas) {
      const properties = 'properties' in schema ? schema.properties ?? {} : {}
      const hasBinary = Object.values(properties).some((item) => this.isBinary(item))

      if (hasBinary) return 'multipart/form-data'
    }

    return 'application/json'
  }

  /**
   * Looks through component references, unions and arrays,
   * e.g. optional file or a list of files.
   */
  private isBinary(item: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject): boolean {
    const schema = ('$raw' in item ? item.$raw : item) as SchemaObject

    if (schema.type === 'string' && schema.format === 'binary') return true
    if (schema.type === 'array') return this.isBinary(schema.items)

    return [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])].some((child) => this.isBinary(child))
  }
}
