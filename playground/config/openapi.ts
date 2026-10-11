import { defineConfig } from '@outloud/adonis-openapi'
import env from '#start/env'
import { decimalHandler } from '#types/decimal'

const openapiConfig = defineConfig({
  enabled: true,
  provider: 'scalar',
  document: {
    info: {
      title: 'Playground',
      version: '0.0.0',
    },
    servers: [{ url: env.get('APP_URL') }],
    components: {
      securitySchemes: {
        bearer: { type: 'http', scheme: 'bearer' },
      },
    },
  },
  generator: {
    resolve: import.meta.resolve,
    routes: true,
    handlers: [decimalHandler],
  },
})

export default openapiConfig
