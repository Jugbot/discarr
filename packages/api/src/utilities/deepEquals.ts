export function isPrimitive(obj: unknown) {
  return obj !== Object(obj)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isObject(obj: unknown): obj is Record<keyof any, unknown> {
  return typeof obj === 'object' && obj !== null
}

export function deepEquals(obj1: unknown, obj2: unknown) {
  if (obj1 === obj2) return true

  if (isObject(obj1) && isObject(obj2)) {
    if (Object.keys(obj1).length !== Object.keys(obj2).length) return false

    for (const key in obj1) {
      if (!(key in obj2)) return false
      if (!deepEquals(obj1[key], obj2[key])) return false
    }

    return true
  }

  return obj1 === obj2
}
