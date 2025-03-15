import app from '@adonisjs/core/services/app'
import { OpenAPI } from '../src/openapi.js'

let openapi: OpenAPI

await app.booted(async () => {
  openapi = await app.container.make('openapi')
})

export { openapi as default }
