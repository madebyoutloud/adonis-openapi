export function compare(value: string, test: RegExp | string) {
  if (typeof test === 'string') return value === test

  return test.test(value)
}
