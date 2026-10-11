import type { Handler } from '@outloud/adonis-openapi-generator'

/**
 * Stand-in for a third-party type, the schema comes from `decimalHandler`.
 */
export class Decimal {
  constructor(private value: string) {}

  plus(other: Decimal) {
    return new Decimal(String(Number(this.value) + Number(other.value)))
  }
}

export const decimalHandler: Handler = {
  path: /\/app\/types\/decimal/,
  name: 'Decimal',
  schema: () => ({ type: 'string', pattern: '^-?\\d+(\\.\\d+)?$' }),
}
