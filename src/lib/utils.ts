import { strToU8, zlibSync } from 'fflate'

export const encodeBlueprint = (blueprint: Record<string, unknown>): string => {
  const compressed = zlibSync(strToU8(JSON.stringify(blueprint)))
  let binary = ''
  for (let i = 0; i < compressed.length; i++) {
    binary += String.fromCharCode(compressed[i])
  }
  return '0' + btoa(binary)
}

export const arrayChunks = <T>(array: T[], chunk_size: number) =>
  Array(Math.ceil(array.length / chunk_size))
    .fill(0)
    .map((_, index) => index * chunk_size)
    .map((begin) => array.slice(begin, begin + chunk_size))

export type Invert<T extends Record<PropertyKey, PropertyKey>> = {
  [P in keyof T as T[P]]: P
}

const swap = <T>([a, b]: [T, T]) => [b, a]
export const invert = <T extends Record<PropertyKey, PropertyKey>>(
  o: T,
): Invert<T> => Object.fromEntries(Object.entries(o).map(swap))

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const localEntityNumberToAbsolute =
  (entitiesSoFar: number) => (localEntityNumber: number) =>
    entitiesSoFar + localEntityNumber
