/**
 * Schema is taken from the `toOpenAPI` return type.
 */
export class Money {
  constructor(public amount: number, public currency: string) {}

  toOpenAPI(): { amount: number, currency: string } {
    return { amount: this.amount, currency: this.currency }
  }
}
