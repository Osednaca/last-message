import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { cn } from '@/lib/utils'

describe('Project setup', () => {
  it('should have vitest working', () => {
    expect(true).toBe(true)
  })

  it('should have fast-check working', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return typeof n === 'number'
      }),
      { numRuns: 10 }
    )
  })

  it('should have cn utility working', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
