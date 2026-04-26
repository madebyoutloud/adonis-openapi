import type { OpenAPIV3_1 } from 'openapi-types'
import type { ResourceActionNames } from '@adonisjs/core/types/http'
import { Route, RouteResource, RouteGroup, BriskRoute } from '@adonisjs/core/http'
import { omit } from '@outloud/utils'

import type { Meta } from './meta.js'

export type RouteResourceOpenApiOptions<
  ActionNames extends ResourceActionNames,
> = OpenAPIV3_1.OperationObject & Partial<Record<ActionNames, OpenAPIV3_1.OperationObject>>

export function registerRouteMacros(meta: Meta) {
  Route.macro('openapi', function (this: Route, options: OpenAPIV3_1.OperationObject) {
    meta.set(this, options)
    return this
  })

  RouteResource.macro(
    'openapi',
    function (this: RouteResource, options: RouteResourceOpenApiOptions<ResourceActionNames>) {
      const globalOptions = omit(options, ['create', 'index', 'store', 'show', 'edit', 'update', 'destroy'])

      this.routes.forEach((route) => {
        const name = route.getName()!.split('.').pop() as ResourceActionNames
        meta.set(route, { ...globalOptions, ...(options[name] ?? {}) })
      })

      return this
    },
  )

  RouteGroup.macro('openapi', function (this: RouteGroup, options: OpenAPIV3_1.OperationObject) {
    function handleRoute(route: Route | RouteGroup | RouteResource | BriskRoute) {
      if (route instanceof Route) {
        meta.merge(route, options)
      } else if (route instanceof RouteResource) {
        route.routes.forEach(handleRoute)
      } else if (route instanceof BriskRoute) {
        meta.merge(route.route!, options)
      } else if (route instanceof RouteGroup) {
        route.routes.forEach(handleRoute)
      }
    }

    this.routes.forEach(handleRoute)

    return this
  })
}
