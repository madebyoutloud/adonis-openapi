import type { OpenAPIConfig } from './types.js'

export function defineConfig<T extends OpenAPIConfig>(config: T): T {
  return config
}
