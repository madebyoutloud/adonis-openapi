export function compare(value: string, test: RegExp | string) {
  if (typeof test === 'string') return value === test

  return test.test(value)
}

export function sortObject<T extends Record<string, any>>(obj: T): T {
  return Object.keys(obj)
    .toSorted()
    .reduce((sorted, key) => {
      sorted[key as keyof T] = obj[key]
      return sorted
    }, {} as T)
}
