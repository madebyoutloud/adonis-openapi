import stringHelpers from '@adonisjs/core/helpers/string'
import type TsMorph from 'ts-morph'
import { compare } from './helpers.ts'

const IGNORED_FOLDER_NAMES = [
  'validators',
  'models',
  'controllers',
]

const regex = /^import\((?:'|")([^'"]+)(?:'|")\)\.(\w+)$/

export class Reference {
  /**
   * Name of the type declaration, preferred over the export name for the component name.
   * Those differ e.g. in shared chunks of bundled packages, which export `Token` as `s`.
   */
  declaredName?: string

  constructor(
    public name: string,
    public path: string,
    private initial = 0,
  ) {

  }

  get key() {
    return `${this.path}:${this.name}`
  }

  get normalizeName() {
    return stringHelpers.pascalCase(this.declaredName ?? this.name)
  }

  static test(text: string) {
    const match = text.match(regex)

    if (match) {
      return { name: match[2]!, path: match[1]! }
    }
  }

  static try(text: string) {
    const match = text.match(regex)

    if (match) return new this(match[2]!, match[1]!)
  }

  static fromType(type: TsMorph.Type) {
    return this.try(type.getText())?.useDeclaredName(type)
  }

  /**
   * Skipped for anonymous types, e.g. `__type`, `__object` or `default`.
   */
  useDeclaredName(type: TsMorph.Type) {
    const name = (type.getAliasSymbol() ?? type.getSymbol())?.getName()

    if (name && name !== 'default' && /^[a-z][\w$]*$/i.test(name)) {
      this.declaredName = name
    }

    return this
  }

  async load() {
    let fullPath = this.path

    if (!/\.(?:js|ts)x?$/.test(fullPath)) {
      fullPath += '.js'
    }

    const Module = await import(fullPath)
    return Module[this.name]
  }

  test(name?: string | RegExp, path?: string | RegExp) {
    if (name && !compare(this.name, name)) return false
    if (path && !compare(this.path, path)) return false

    return true
  }

  * lookupName(root: string) {
    const parts = this.getPathParts(root)

    // if export name is called 'default' we do not want to add it
    // e.g. import('#controllers/user.controller').default
    // also skip path part if it equals to the name
    // e.g. import('#models/user').User
    const name = this.normalizeName
    if (this.name !== 'default' && parts[parts.length - 1] !== name) {
      parts.push(name)
    }

    const current: string[] = []
    let index = 0

    while (parts.length > 0) {
      current.unshift(parts.pop()!)

      if (index >= this.initial || !parts.length) {
        yield current.join('')
      }

      index++
    }
  }

  private getPathParts(root: string) {
    return this.path
      .substring(root.length)
      .replace(/^app\//, '')
      .split('/')
      .filter((item) => !IGNORED_FOLDER_NAMES.includes(item))
      .map((item) => {
        return stringHelpers.pascalCase(
          item
            .replace(/\.(?:js|ts)x?$/, '')
            .replace(/[._-](?:validator|controller)$/, ''),
        )
      })
  }
}
