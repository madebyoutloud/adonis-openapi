import type { HttpContext } from '@adonisjs/core/http'
import Post from '#models/post'
import Comment from '#models/comment'
import { createPostValidator, updatePostValidator } from '#validators/post'

export default class PostsController {
  async index() {
    return Post.query().preload('author')
  }

  async show({ params }: HttpContext) {
    return Post.query()
      .where('id', params.id)
      .preload('author')
      .preload('comments')
      .firstOrFail()
  }

  async store({ request }: HttpContext) {
    const { title, body, status, tags = [], publishedAt } = await request.validateUsing(createPostValidator)

    return Post.create({ title, body, status, tags, publishedAt })
  }

  async update({ params, request }: HttpContext) {
    const post = await Post.findOrFail(params.id)
    const data = await request.validateUsing(updatePostValidator)

    return post.merge(data).save()
  }

  async destroy({ params }: HttpContext) {
    const post = await Post.findOrFail(params.id)
    await post.delete()

    return { deleted: true as const }
  }

  async comments({ params, request }: HttpContext) {
    return Comment.query()
      .where('postId', params.id)
      .paginate(request.input('page', 1))
  }

  async forUser({ params }: HttpContext) {
    return Post.query()
      .where('authorId', params.id)
      .if(params.postId, (query) => query.where('id', params.postId))
  }
}
