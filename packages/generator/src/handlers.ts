import type TsMorph from 'ts-morph'
import type { Handler } from './types.ts'
import { Reference } from './reference.ts'
import type { Context } from './context.ts'
import { compare } from './helpers.ts'

export class Handlers extends Array<Handler> {
  constructor(items: Handler[]) {
    super()

    items.length && this.push(...items)
  }

  match(type: TsMorph.Type, context: Context) {
    const text = type.getText()
    const ref = Reference.try(text)

    for (const item of this) {
      if ((item.name || item.path) && (!ref || !ref.test(item.name, item.path))) continue
      if (item.text && !compare(text, item.text)) continue
      if (item.test && !item.test(type, context)) continue

      return item
    }
  }
}
