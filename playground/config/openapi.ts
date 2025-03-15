import { defineConfig } from '@outloud/adonis-openapi'

export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: 'My API',
      version: '1.0.0',
    },
  },
})
