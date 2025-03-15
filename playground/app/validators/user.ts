import vine from '@vinejs/vine'

export const createPostValidator = vine.compile(
  vine.object({
    title: vine.string(),
  })
)


export const indexPostValidator = vine.compile(
  vine.object({
    q: vine.string().nullable().optional(),
    page: vine.number().min(1).max(100),
    createdAt: vine.object({
      gte: vine.string().optional(),
      lte: vine.string().optional()
    }).optional(),
    nested: vine.object({
      title: vine.string().optional(),
      name: vine.string(),
    }),
    optionalNested: vine.object({
      title: vine.string().optional()
    }).optional(),
    list: vine.array(vine.string()).optional(),
    listEnum: vine.array(vine.enum(['a', 'b', 'c'] as const)).optional(),
    enum: vine.enum(['a', 'b', 'c'] as const),
    nestedList: vine.array(vine.object({
      title: vine.string()
    })).optional(),
  })
)
