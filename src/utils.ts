export function isConstructor(fn: Function) {
  try {
    Reflect.construct(String, [], fn)
  } catch (e) {
    return false
  }
  return true
}

const THUNK_EXTRACT_RE = /.+=>(.+)/
export function extractNameFromThunk(thunk: Function): string | undefined {
  const res = THUNK_EXTRACT_RE.exec(thunk.toString())
  if (!res || res.length < 2) {
    return
  }
  return res[1].trim()
}

export function set<T extends object, K extends string>(object: T, key: K, value: unknown) {
  const path = key.split('.')
  const length = path.length
  const lastIndex = length - 1

  let index = -1
  let obj: any = object

  while (obj != null && ++index < length) {
    if (index === lastIndex) {
      obj[path[index]] = value
    } else if (obj[path[index]] == null) {
      obj[path[index]] = {}
    }

    obj = obj[path[index]]
  }

  return object
}
