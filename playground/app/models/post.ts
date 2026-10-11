import type { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { Decimal } from '#types/decimal'
import User from '#models/user'
import Comment from '#models/comment'

export default class Post extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare body: string

  @column()
  declare status: 'draft' | 'published'

  @column()
  declare tags: string[]

  @column()
  declare price: Decimal

  @column()
  declare authorId: number

  @column.dateTime()
  declare publishedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'authorId' })
  declare author: BelongsTo<typeof User>

  @hasMany(() => Comment)
  declare comments: HasMany<typeof Comment>
}
