import zlib from 'zlib'

export const encodeBlueprint = (blueprint: Record<string, unknown>) =>
  '0' + zlib.deflateSync(JSON.stringify(blueprint)).toString('base64')

export const arrayChunks = <T>(array: T[], chunk_size: number) =>
  Array(Math.ceil(array.length / chunk_size))
    .fill(0)
    .map((_, index) => index * chunk_size)
    .map((begin) => array.slice(begin, begin + chunk_size))
