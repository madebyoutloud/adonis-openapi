import type { GeneratorOptions } from '@outloud/adonis-openapi-generator'
import type { OpenAPIV3_1 } from 'openapi-types'

export interface OpenapiConfig {
  document?: Partial<OpenAPIV3_1.Document>
  generator: GeneratorOptions
}
