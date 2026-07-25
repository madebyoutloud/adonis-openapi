import type { OpenAPIV3_1 } from 'openapi-types'
import type { MiddlewareFn, ParsedNamedMiddleware } from '@adonisjs/core/types/http'
import type { GeneratorConfig } from '@outloud/adonis-openapi-generator'
import type { ScalarOptions } from './ui.js'

/** Mirrors `OneOrMore` from `@poppinss/utils/types` (not a direct dependency). */
type OneOrMore<T> = T | T[]

type EndpointsMiddleware = OneOrMore<MiddlewareFn | ParsedNamedMiddleware>

export interface OpenAPIConfig {
  enabled: boolean
  provider: 'scalar'
  scalar?: ScalarOptions
  endpoints?: {
    /** @default '/docs' */
    ui?: string
    /** @default '/openapi.json' */
    spec?: string
    /**
     * Factory returning middleware applied to both the spec and UI routes,
     * e.g. auth to avoid serving the docs publicly. A factory (rather than a
     * plain value) because named middleware lives in `#start/kernel`, which is
     * evaluated after config files — a top-level import would crash the boot:
     *
     * ```ts
     * endpoints: {
     *   middleware: async () => {
     *     const { middleware } = await import('#start/kernel')
     *     return [middleware.auth()]
     *   },
     * }
     * ```
     */
    middleware?: () => EndpointsMiddleware | Promise<EndpointsMiddleware>
  }
  document: Omit<OpenAPIV3_1.Document, 'openapi'>
  generator: GeneratorConfig
}
