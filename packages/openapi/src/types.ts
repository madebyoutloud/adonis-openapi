import type { GeneratorConfig } from '@outloud/adonis-openapi-generator'
import type { OpenAPIV3_1 } from 'openapi-types'
import type { ScalarOptions } from './ui.js'

type UiOptions = {
  provider: 'scalar'
} & ScalarOptions

export interface OpenAPIConfig {
  enabled: boolean
  endpoints?: {
    /** @default '/docs' */
    ui?: string
    /** @default '/openapi.json' */
    spec?: string
  }
  ui: UiOptions
  document: Omit<OpenAPIV3_1.Document, 'openapi'>
  generator: GeneratorConfig
}
