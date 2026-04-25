import stringHelpers from '@adonisjs/core/helpers/string'
import { compare } from './helpers.ts'

const IGNORED_FOLDER_NAMES = [
  'validators',
  'models',
  'controllers',
]

const regex = /^import\((?:'|")([^'"]+)(?:'|")\)\.(\w+)$/

export class Reference {
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
    return stringHelpers.pascalCase(this.name)
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
    // also skip path part if it equals to export name
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
