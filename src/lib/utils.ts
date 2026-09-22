import zlib from 'zlib'

export const encodeBlueprint = (blueprint: Record<string, unknown>) =>
  '0' + zlib.deflateSync(JSON.stringify(blueprint)).toString('base64')

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
