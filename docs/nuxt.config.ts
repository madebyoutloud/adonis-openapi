export default defineNuxtConfig({
  extends: ['@outloud/docs'],
  site: {
    name: 'AdonisJS OpenAPI',
  },

  package: {
    path: '../packages/openapi',
  },
})
