import type { HttpContext } from '@adonisjs/core/http'
import { uploadValidator } from '#validators/file'

export default class FilesController {
  async upload({ request }: HttpContext) {
    const { title, file } = await request.validateUsing(uploadValidator)

    return {
      title,
      name: file.clientName,
      size: file.size,
    }
  }
}
