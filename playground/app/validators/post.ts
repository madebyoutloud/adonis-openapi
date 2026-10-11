import vine from '@vinejs/vine'

export const createPostValidator = vine.compile(
  vine.object({
    title: vine.string(),
    body: vine.string(),
    status: vine.enum(['draft', 'published']),
    tags: vine.array(vine.string()).optional(),
    publishedAt: vine.date().nullable(),
    seo: vine.object({
      title: vine.string().optional(),
      keywords: vine.array(vine.string()),
    }).optional(),
  }),
)

export const updatePostValidator = vine.create({
  title: vine.string().optional(),
  body: vine.string().optional(),
  status: vine.enum(['draft', 'published']).optional(),
})
