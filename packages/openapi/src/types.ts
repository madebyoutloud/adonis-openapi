import type { OpenAPIV3_1 } from 'openapi-types'
import type { GeneratorConfig } from '@outloud/adonis-openapi-generator'
import type { ScalarOptions } from './ui.js'

export interface OpenAPIConfig {
  enabled: boolean
  provider: 'scalar'
  scalar?: ScalarOptions
  endpoints?: {
    /** @default '/docs' */
    ui?: string
    /** @default '/openapi.json' */
    spec?: string
  }
  document: Omit<OpenAPIV3_1.Document, 'openapi'>
  generator: GeneratorConfig
}
