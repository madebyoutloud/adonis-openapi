/*
|--------------------------------------------------------------------------
| Source hooks
|--------------------------------------------------------------------------
|
| Resolves the workspace packages to their TypeScript sources, so the
| playground runs without building them. Imported by the entrypoints
| before any other module, TypeScript is compiled by `@poppinss/ts-exec`.
|
| Disabled in CI, which tests the built packages as they are published.
|
*/

import { registerHooks } from 'node:module'

const packages = new URL('../../packages/', import.meta.url)

const aliases: Record<string, URL> = {
  '@outloud/adonis-openapi-generator': new URL('generator/src/index.ts', packages),
  '@outloud/adonis-openapi': new URL('openapi/src/index.ts', packages),
  '@outloud/adonis-openapi/provider': new URL('openapi/providers/openapi.provider.ts', packages),
  '@outloud/adonis-openapi/commands': new URL('./commands.ts', import.meta.url),
}

if (!process.env.CI) {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      return nextResolve(aliases[specifier]?.href ?? specifier, context)
    },
  })
}
