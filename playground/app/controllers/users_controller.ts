import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { createUserValidator, listUsersValidator } from '#validators/user'

export default class UsersController {
  async index({ request }: HttpContext) {
    const { page = 1, limit = 20, search, role } = await request.validateUsing(listUsersValidator)

    return User.query()
      .if(search, (query) => query.whereILike('email', `%${search}%`))
      .if(role, (query) => query.where('role', role!))
      .paginate(page, limit)
  }

  async show({ params }: HttpContext) {
    return User.findOrFail(params.id)
  }

  async store({ request }: HttpContext) {
    const data = await request.validateUsing(createUserValidator)

    return User.create(data)
  }

  async destroy({ params, response }: HttpContext) {
    const user = await User.findOrFail(params.id)
    await user.delete()

    return response.noContent()
  }
}
