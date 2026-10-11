import vine from '@vinejs/vine'

export const listUsersValidator = vine.create({
  page: vine.number().optional(),
  limit: vine.number().optional(),
  search: vine.string().optional(),
  role: vine.enum(['admin', 'editor', 'viewer']).optional(),
})

export const createUserValidator = vine.create({
  email: vine.string().email(),
  firstName: vine.string().minLength(1),
  lastName: vine.string().minLength(1),
  middleName: vine.string().optional(),
  password: vine.string().minLength(8),
  role: vine.enum(['admin', 'editor', 'viewer']),
  age: vine.number().optional(),
  acceptTerms: vine.boolean(),
})
