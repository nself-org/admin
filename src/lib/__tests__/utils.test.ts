import { cn } from '../utils'

describe('utils', () => {
  describe('cn (className utility)', () => {
    it('merges class names', () => {
      const result = cn('class1', 'class2')
      expect(result).toBe('class1 class2')
    })

    it('handles conditional classes', () => {
      const isActive = true
      const isDisabled = false
      const result = cn('base', isActive && 'conditional', isDisabled && 'excluded')
      expect(result).toBe('base conditional')
    })

    it('handles undefined and null', () => {
      const result = cn('base', undefined, null, 'end')
      expect(result).toBe('base end')
    })

    it('handles objects with boolean values', () => {
      const result = cn('base', {
        active: true,
        disabled: false,
        hover: true,
      })
      expect(result).toContain('base')
      expect(result).toContain('active')
      expect(result).toContain('hover')
      expect(result).not.toContain('disabled')
    })

    it('handles arrays', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
      expect(result).toContain('class3')
    })

    it('returns empty string with no arguments', () => {
      const result = cn()
      expect(result).toBe('')
    })
  })
})
