import User from '#models/user'
import { ApiOperation, ApiResponse, ApiHeader } from '@outloud/adonis-openapi/decorators'

export default class DemoController {
  @ApiOperation({ summary: 'Generate a super cool thing' })
  @ApiResponse({ type: User })
  @ApiHeader({ name: 'hey' })
  async index() {
    console.log('hello worl')
  }
}
