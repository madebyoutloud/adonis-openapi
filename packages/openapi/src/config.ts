import type { OpenapiConfig } from './types.js'

export function defineConfig<T extends OpenapiConfig>(config: T): T {
  return config
}
