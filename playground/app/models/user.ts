import type { DateTime } from 'luxon'
import { BaseModel, column, computed, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Post from '#models/post'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column({ serializeAs: 'first_name' })
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare middleName?: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare role: 'admin' | 'editor' | 'viewer'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => Post, { foreignKey: 'authorId' })
  declare posts: HasMany<typeof Post>

  @computed()
  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }
}
