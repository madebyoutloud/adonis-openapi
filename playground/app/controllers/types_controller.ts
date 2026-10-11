import encryption from '@adonisjs/core/services/encryption'
import { DateTime, Duration, Interval } from 'luxon'
import { Money } from '#types/money'

enum Visibility {
  Public = 'public',
  Private = 'private',
}

interface Address {
  street: string
  city: string
  zip?: string
}

interface Circle {
  kind: 'circle'
  radius: number
}

interface Square {
  kind: 'square'
  size: number
}

interface Page<T> {
  items: T[]
  total: number
}

class Envelope<T> {
  constructor(private data: T) {}

  toJSON(): { data: T, version: number } {
    return { data: this.data, version: 1 }
  }
}

function generic<T>(data: T) {
  return {
    data,
    status: 'ok',
  }
}

/**
 * One action per TypeScript construct the generator has to understand.
 */
export default class TypesController {
  async primitives() {
    return {
      string: 'text',
      number: 1,
      boolean: true,
      null: null,
      literal: 'fixed' as const,
      literalNumber: 42 as const,
      literalUnion: 'a' as 'a' | 'b' | 'c',
      enum: Visibility.Public as Visibility,
    }
  }

  async optional(): Promise<{
    required: string
    optional?: string
    undefinable: string | undefined
    nullable: string | null
  }> {
    return { required: '', undefinable: undefined, nullable: null }
  }

  async collections(): Promise<{
    strings: string[]
    matrix: number[][]
    tuple: [string, number, boolean]
    record: Record<string, number>
    addresses: Address[]
  }> {
    return { strings: [], matrix: [], tuple: ['', 0, false], record: {}, addresses: [] }
  }

  async unions(): Promise<{
    shape: Circle | Square
    mixed: string | number
    nullableObject: Address | null
  }> {
    return { shape: { kind: 'circle', radius: 1 }, mixed: '', nullableObject: null }
  }

  async intersection(): Promise<Address & { country: string }> {
    return { street: '', city: '', country: '' }
  }

  async overrides() {
    return {
      price: new Money(10, 'EUR'),
      unknown: null as unknown,
      any: null as any,
    }
  }

  async custom() {
    return {
      encrypted: encryption.encrypt('test'),
      timestamp: DateTime.now(),
      duration: Duration.fromObject({ day: 1 }),
      interval: Interval.fromDateTimes(DateTime.now(), DateTime.now()),
    }
  }

  async generic() {
    return generic({
      message: 'Hello World',
    })
  }

  async genericTypes(): Promise<{ page: Page<Address>, envelope: Envelope<Circle> }> {
    return {
      page: { items: [], total: 0 },
      envelope: new Envelope({ kind: 'circle', radius: 1 }),
    }
  }
}
