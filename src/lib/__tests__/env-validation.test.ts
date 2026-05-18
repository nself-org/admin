import { checkRuntimeEnvironment, validateEnv } from '../env-validation'

describe('Environment Validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('validateEnv', () => {
    it('should validate with default values', () => {
      // Clear PORT to test default value
      delete process.env.PORT
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      })
      const config = validateEnv()
      expect(config).toBeDefined()
      expect(config.NODE_ENV).toBe('development')
      expect(config.PORT).toBe('3021')
    })

    it('should accept custom port', () => {
      process.env.PORT = '8080'
      const config = validateEnv()
      expect(config.PORT).toBe('8080')
    })

    it('should validate port format', () => {
      process.env.PORT = 'invalid'
      expect(() => validateEnv()).toThrow()
    })

    it('should accept valid environment modes', () => {
      const modes = ['development', 'production', 'test'] as const

      modes.forEach((mode) => {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: mode,
          writable: true,
          configurable: true,
        })
        const config = validateEnv()
        expect(config.NODE_ENV).toBe(mode)
      })
    })

    it('should default to production for NODE_ENV', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      const config = validateEnv()
      expect(config.NODE_ENV).toBe('production')
    })

    it('should accept project path', () => {
      process.env.PROJECT_PATH = '/custom/path'
      const config = validateEnv()
      expect(config.PROJECT_PATH).toBe('/custom/path')
    })

    it('should accept auto update setting', () => {
      process.env.AUTO_UPDATE = 'false'
      const config = validateEnv()
      expect(config.AUTO_UPDATE).toBe('false')
    })

    it('should validate update check interval', () => {
      process.env.UPDATE_CHECK_INTERVAL = '12'
      const config = validateEnv()
      expect(config.UPDATE_CHECK_INTERVAL).toBe('12')
    })

    it('should reject invalid update check interval', () => {
      process.env.UPDATE_CHECK_INTERVAL = 'invalid'
      expect(() => validateEnv()).toThrow()
    })

    it('should accept timezone setting', () => {
      process.env.TZ = 'America/New_York'
      const config = validateEnv()
      expect(config.TZ).toBe('America/New_York')
    })

    it('should accept optional API URL', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com'
      const config = validateEnv()
      expect(config.NEXT_PUBLIC_API_URL).toBe('https://api.example.com')
    })

    it('should validate API URL format', () => {
      process.env.NEXT_PUBLIC_API_URL = 'not-a-url'
      expect(() => validateEnv()).toThrow()
    })

    it('should accept base domain', () => {
      process.env.BASE_DOMAIN = 'example.com'
      const config = validateEnv()
      expect(config.BASE_DOMAIN).toBe('example.com')
    })

    it('should accept admin version', () => {
      process.env.ADMIN_VERSION = '0.0.7'
      const config = validateEnv()
      expect(config.ADMIN_VERSION).toBe('0.0.7')
    })
  })

  describe('Password Validation', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      })
    })

    it('should accept valid password in development', () => {
      process.env.ADMIN_PASSWORD = 'testpass123'
      const config = validateEnv()
      expect(config.ADMIN_PASSWORD).toBe('testpass123')
    })

    it('should accept strong password in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      })
      process.env.ADMIN_PASSWORD = 'StrongP@ssw0rd123'
      const config = validateEnv()
      expect(config.ADMIN_PASSWORD).toBe('StrongP@ssw0rd123')
    })

    it('should reject weak password in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      })
      process.env.ADMIN_PASSWORD = 'weak'

      // Mock process.exit to prevent test from exiting
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)

      // Mock console.error to suppress error output
      const mockError = jest.spyOn(console, 'error').mockImplementation()

      expect(() => validateEnv()).toThrow()

      mockExit.mockRestore()
      mockError.mockRestore()
    })

    it('should warn about weak passwords in development', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      })
      process.env.ADMIN_PASSWORD = 'admin123'

      const mockWarn = jest.spyOn(console, 'warn').mockImplementation()

      validateEnv()

      expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('WARNING'))

      mockWarn.mockRestore()
    })

    it('should enforce minimum 12 characters in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      })
      process.env.ADMIN_PASSWORD = 'Short1@'

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      const mockError = jest.spyOn(console, 'error').mockImplementation()

      expect(() => validateEnv()).toThrow()

      mockExit.mockRestore()
      mockError.mockRestore()
    })

    it('should enforce complexity requirements in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      })

      const weakPasswords = [
        'alllowercase123!',
        'ALLUPPERCASE123!',
        'NoNumbers!@#',
        'NoSpecialChar123',
      ]

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      const mockError = jest.spyOn(console, 'error').mockImplementation()

      weakPasswords.forEach((password) => {
        process.env.ADMIN_PASSWORD = password
        expect(() => validateEnv()).toThrow()
      })

      mockExit.mockRestore()
      mockError.mockRestore()
    })

    it('should reject common weak passwords', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      })

      const commonPasswords = ['admin123', 'changeme', 'password', 'default']

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      const mockError = jest.spyOn(console, 'error').mockImplementation()

      commonPasswords.forEach((password) => {
        process.env.ADMIN_PASSWORD = password
        expect(() => validateEnv()).toThrow()
      })

      mockExit.mockRestore()
      mockError.mockRestore()
    })

    it('should allow missing password (will be generated)', () => {
      delete process.env.ADMIN_PASSWORD
      const config = validateEnv()
      expect(config.ADMIN_PASSWORD).toBeUndefined()
    })
  })

  describe('checkRuntimeEnvironment', () => {
    it('should check runtime environment', () => {
      const checks = checkRuntimeEnvironment()

      expect(checks).toHaveProperty('dockerSocket')
      expect(checks).toHaveProperty('projectDir')
      expect(checks).toHaveProperty('writePermissions')
      expect(checks).toHaveProperty('nselfCli')

      // Check that all values are booleans
      expect(typeof checks.dockerSocket).toBe('boolean')
      expect(typeof checks.projectDir).toBe('boolean')
      expect(typeof checks.writePermissions).toBe('boolean')
      expect(typeof checks.nselfCli).toBe('boolean')
    })

    it('should handle missing Docker socket gracefully', () => {
      const mockWarn = jest.spyOn(console, 'warn').mockImplementation()

      // Mock fs to throw error
      jest.mock('fs', () => ({
        accessSync: jest.fn(() => {
          throw new Error('Not accessible')
        }),
      }))

      const checks = checkRuntimeEnvironment()

      // Should not throw, just warn
      expect(checks).toBeDefined()

      mockWarn.mockRestore()
    })

    it('should handle missing nself CLI gracefully', () => {
      const mockWarn = jest.spyOn(console, 'warn').mockImplementation()

      const checks = checkRuntimeEnvironment()

      // Should not throw, just warn if CLI not found
      expect(checks).toBeDefined()

      mockWarn.mockRestore()
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing environment variables', () => {
      process.env = {} as any

      // Should use defaults
      const config = validateEnv()
      expect(config.NODE_ENV).toBe('production')
      expect(config.PORT).toBe('3021')
      expect(config.PROJECT_PATH).toBe('/project')
    })

    it('should handle extra environment variables', () => {
      process.env.EXTRA_VAR = 'extra'
      process.env.ANOTHER_VAR = 'another'

      // Should not fail
      const config = validateEnv()
      expect(config).toBeDefined()
    })

    it('should handle boolean-like strings', () => {
      process.env.AUTO_UPDATE = 'true'
      const config = validateEnv()
      expect(config.AUTO_UPDATE).toBe('true')

      process.env.AUTO_UPDATE = 'false'
      const config2 = validateEnv()
      expect(config2.AUTO_UPDATE).toBe('false')
    })

    it('should reject invalid boolean values', () => {
      process.env.AUTO_UPDATE = 'yes'
      expect(() => validateEnv()).toThrow()
    })

    it('should handle numeric strings correctly', () => {
      process.env.PORT = '0000'
      const config = validateEnv()
      expect(config.PORT).toBe('0000')

      process.env.UPDATE_CHECK_INTERVAL = '999'
      const config2 = validateEnv()
      expect(config2.UPDATE_CHECK_INTERVAL).toBe('999')
    })
  })

  describe('Production Safety', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      })
    })

    it('should exit on validation error in production', () => {
      process.env.PORT = 'invalid-port'

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)

      expect(() => validateEnv()).toThrow()

      mockExit.mockRestore()
    })

    it('should exit on weak password in production', () => {
      process.env.ADMIN_PASSWORD = 'admin123'

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      const mockError = jest.spyOn(console, 'error').mockImplementation()

      expect(() => validateEnv()).toThrow()

      mockExit.mockRestore()
      mockError.mockRestore()
    })
  })
})
