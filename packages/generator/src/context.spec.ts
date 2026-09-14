import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { Context } from './context.ts'
import { Components } from './components.ts'
import { Handlers } from './handlers.ts'

/**
 * Regression test for https://github.com/madebyoutloud/adonis-openapi/issues/5
 *
 * A property typed as a bare generic parameter (e.g. `data: T` on a generic
 * response wrapper) used to serialize as an empty schema: objectToSchema (and
 * isOptional) read the property's type from its VALUE DECLARATION first,
 * which is the type as written in the (possibly generic) declaring
 * interface, not as instantiated at the actual call site.
 */
function createContext(source: string, typeName: string) {
  const project = new Project({ useInMemoryFileSystem: true })
  const file = project.createSourceFile('index.ts', source)
  const type = file.getInterfaceOrThrow(typeName).getType()

  return new Context(type, {
    components: new Components('/'),
    handlers: new Handlers([]),
    node: file,
    root: '/',
    project,
    resolve: (specifier) => specifier,
  })
}

describe('Context#objectToSchema', () => {
  it('resolves a property typed as an instantiated generic parameter, not the bare parameter', async () => {
    const context = createContext(
      `
      export interface ApiResult<T> {
        code: number
        data: T
      }

      export interface Instantiated extends ApiResult<{ status: string, service: string }> {}
      `,
      'Instantiated',
    )

    const schema = await context.objectToSchema(context.type)

    expect(schema.properties?.data).toEqual({
      type: 'object',
      properties: {
        status: { type: 'string' },
        service: { type: 'string' },
      },
      required: ['service', 'status'],
    })
  })
})

describe('Context#isOptional', () => {
  it('checks the instantiated type, not the bare generic parameter', async () => {
    const context = createContext(
      `
      export interface Wrapper<T> {
        value: T
      }

      export interface Instantiated extends Wrapper<string | undefined> {}
      `,
      'Instantiated',
    )

    const prop = context.type.getPropertyOrThrow('value')

    expect(context.isOptional(prop)).toBe(true)
  })
})
