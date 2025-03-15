import type { OpenAPIConfig } from './types.js'

type UserOpenAPIConfig = Partial<OpenAPIConfig>

/**
 * Creates an OpenAPI configuration.
 */
export function defineConfig(config: UserOpenAPIConfig): OpenAPIConfig {
  const defaults: OpenAPIConfig = {
    ui: 'scalar',
    router: {
      detect: 'auto',
      params: true,
    },
    document: {
      info: {
        title: '',
        version: '',
      },
    },
  }

  return Object.assign(defaults, config)
}
