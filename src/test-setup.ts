import { beforeAll, beforeEach, MockInstance, vi } from 'vitest'
import { mkAlea } from '@spissvinkel/alea'

let randomSpy: MockInstance<() => number>

beforeAll(() => {
  vi.mock('@/package.json', () => ({
    default: { version: '0.0.0' },
  }))

  randomSpy = vi.spyOn(Math, 'random')
})

beforeEach(() => {
  const { random } = mkAlea('seed')
  randomSpy.mockImplementation(() => random())
})
