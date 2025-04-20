export function deepEquals(obj1: unknown, obj2: unknown) {
  return JSON.stringify(obj1) === JSON.stringify(obj2)
}
