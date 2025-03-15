import { createPostValidator, indexPostValidator } from '#validators/user'
import { ApiBody, ApiOperation, ApiParam, ApiQueries, ApiResponse } from '@outloud/adonis-openapi/decorators'

export default class PostsController {
  @ApiOperation({ summary: 'List all posts' })
  @ApiQueries({ type: () => indexPostValidator})
  async index() {}

  @ApiOperation({ summary: 'Create a post' })
  @ApiBody({ type: () => indexPostValidator })
  @ApiResponse({ type: () => createPostValidator })
  async store() {}

  @ApiOperation({ summary: 'Get a post' })
  @ApiParam({ name: 'test' })
  @ApiBody({ type: 'object'})
  @ApiResponse({ type: 'object'})
  async show() {}
  async destroy() {}
}
