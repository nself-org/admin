// Mock child_process.execFile before imports
const mockExecFile = jest.fn()
jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execFile: mockExecFile,
  spawn: jest.fn(() => ({
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn(),
    kill: jest.fn(),
  })),
}))

// Mock util.promisify to return our mocked async function
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn((fn) => {
    // If it's our mocked execFile, return a function that returns the mock's promise
    if (fn === mockExecFile) {
      return jest.fn((...args: unknown[]) => {
        return mockExecFile(...args)
      })
    }
    // For other functions, use real promisify
    return jest.requireActual('util').promisify(fn)
  }),
}))

// Mock nself-path to return a known path
jest.mock('../nself-path', () => ({
  findNselfPathSync: jest.fn(() => '/usr/local/bin/nself'),
  getEnhancedPath: jest.fn(() => '/usr/local/bin:/usr/bin'),
}))

// Mock paths to return a known project path
jest.mock('../paths', () => ({
  getProjectPath: jest.fn(() => '/test/project'),
}))

describe('nself CLI Module', () => {
  let nselfCLI: typeof import('../nselfCLI')

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()

    // Set up default successful mock implementation - returns a Promise
    mockExecFile.mockResolvedValue({
      stdout: 'success',
      stderr: '',
    })

    // Re-import module to get fresh instance with mocks
    nselfCLI = require('../nselfCLI')
  })

  describe('executeNselfCommand', () => {
    it('should execute valid commands', async () => {
      const result = await nselfCLI.executeNselfCommand('status')
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('success')
    })

    it('should reject invalid commands', async () => {
      const result = await nselfCLI.executeNselfCommand('invalid-command' as 'status')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid nself command')
    })

    it('should pass arguments correctly', async () => {
      await nselfCLI.executeNselfCommand('logs', ['postgres', '-n100'])
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['logs', 'postgres', '-n100'],
        expect.objectContaining({
          cwd: '/test/project',
        })
      )
    })

    it('should filter out invalid arguments', async () => {
      await nselfCLI.executeNselfCommand('status', [
        'valid',
        '',
        null as unknown as string,
        undefined as unknown as string,
        123 as unknown as string,
      ])
      // The function should filter out non-string and empty arguments
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['status', 'valid'],
        expect.any(Object)
      )
    })

    it('should handle command timeouts', async () => {
      const error = new Error('Command timed out') as Error & { code: string }
      error.code = 'ETIMEDOUT'
      mockExecFile.mockRejectedValueOnce(error)

      const result = await nselfCLI.executeNselfCommand('start', [], {
        timeout: 1000,
      })
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should handle command failures', async () => {
      const execError = new Error('Command failed') as Error & {
        code: number
        stdout: Buffer
        stderr: Buffer
      }
      execError.code = 1
      execError.stdout = Buffer.from('partial output')
      execError.stderr = Buffer.from('error message')

      mockExecFile.mockRejectedValueOnce(execError)

      const result = await nselfCLI.executeNselfCommand('build')
      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('error message')
    })

    it('should apply custom options', async () => {
      await nselfCLI.executeNselfCommand('status', [], {
        timeout: 5000,
        cwd: '/custom/path',
        env: { CUSTOM_VAR: 'value' },
      })

      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['status'],
        expect.objectContaining({
          timeout: 5000,
          cwd: '/custom/path',
        })
      )
    })
  })

  describe('Core Lifecycle Commands', () => {
    it('should execute nselfStatus', async () => {
      const result = await nselfCLI.nselfStatus()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['status'],
        expect.any(Object)
      )
    })

    it('should execute nselfStart', async () => {
      const result = await nselfCLI.nselfStart()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['start'],
        expect.any(Object)
      )
    })

    it('should execute nselfStop', async () => {
      const result = await nselfCLI.nselfStop()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['stop'],
        expect.any(Object)
      )
    })

    it('should execute nselfRestart', async () => {
      const result = await nselfCLI.nselfRestart()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['restart'],
        expect.any(Object)
      )
    })

    it('should execute nselfDoctor', async () => {
      const result = await nselfCLI.nselfDoctor()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['doctor'],
        expect.any(Object)
      )
    })

    it('should execute nselfDoctor with fix flag', async () => {
      const result = await nselfCLI.nselfDoctor(true)
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['doctor', '--fix'],
        expect.any(Object)
      )
    })
  })

  describe('Log Commands', () => {
    it('should execute nselfLogs without arguments', async () => {
      const result = await nselfCLI.nselfLogs()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['logs'],
        expect.any(Object)
      )
    })

    it('should execute nselfLogs with service', async () => {
      const result = await nselfCLI.nselfLogs('postgres')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['logs', 'postgres'],
        expect.any(Object)
      )
    })

    it('should execute nselfLogs with service and lines', async () => {
      const result = await nselfCLI.nselfLogs('postgres', 100)
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['logs', 'postgres', '-n100'],
        expect.any(Object)
      )
    })
  })

  describe('Backup and Restore Commands', () => {
    it('should execute nselfBackup without path', async () => {
      const result = await nselfCLI.nselfBackup()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['backup'],
        expect.any(Object)
      )
    })

    it('should execute nselfBackup with output path', async () => {
      const result = await nselfCLI.nselfBackup('/tmp/backup.tar.gz')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['backup', '--output', '/tmp/backup.tar.gz'],
        expect.any(Object)
      )
    })

    it('should execute nselfRestore', async () => {
      const result = await nselfCLI.nselfRestore('/tmp/backup.tar.gz')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['restore', '/tmp/backup.tar.gz'],
        expect.any(Object)
      )
    })
  })

  describe('Config Commands', () => {
    it('should execute nselfConfig get', async () => {
      const result = await nselfCLI.nselfConfig('get', 'key')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['config', 'get', 'key'],
        expect.any(Object)
      )
    })

    it('should execute nselfConfig set', async () => {
      const result = await nselfCLI.nselfConfig('set', 'key', 'value')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['config', 'set', 'key', 'value'],
        expect.any(Object)
      )
    })
  })

  describe('Database Commands', () => {
    it('should execute nselfDatabase', async () => {
      const result = await nselfCLI.nselfDatabase('SELECT * FROM users')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['db', 'query', 'SELECT * FROM users'],
        expect.any(Object)
      )
    })

    it('should execute nselfDbSync', async () => {
      const result = await nselfCLI.nselfDbSync()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['db', 'sync'],
        expect.any(Object)
      )
    })

    it('should execute nselfDbSeed', async () => {
      const result = await nselfCLI.nselfDbSeed()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['db', 'seed'],
        expect.any(Object)
      )
    })

    it('should execute nselfDbSeed with force', async () => {
      const result = await nselfCLI.nselfDbSeed({ force: true })
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['db', 'seed', '--force'],
        expect.any(Object)
      )
    })

    it('should execute nselfDbMigrate', async () => {
      const result = await nselfCLI.nselfDbMigrate()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['db', 'migrate'],
        expect.any(Object)
      )
    })

    it('should execute nselfDbMigrate with target', async () => {
      const result = await nselfCLI.nselfDbMigrate({ target: 'v2.0.0' })
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['db', 'migrate', '--target', 'v2.0.0'],
        expect.any(Object)
      )
    })

    it('should execute nselfDbBackup', async () => {
      const result = await nselfCLI.nselfDbBackup()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['db', 'backup'],
        expect.any(Object)
      )
    })

    it('should execute nselfDbBackup with output path', async () => {
      const result = await nselfCLI.nselfDbBackup('/tmp/db-backup.sql')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['db', 'backup', '--output', '/tmp/db-backup.sql'],
        expect.any(Object)
      )
    })

    it('should execute nselfDbRestore', async () => {
      const result = await nselfCLI.nselfDbRestore('/tmp/db-backup.sql')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['db', 'restore', '/tmp/db-backup.sql'],
        expect.any(Object)
      )
    })

    it('should execute nselfDbReset', async () => {
      const result = await nselfCLI.nselfDbReset()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['db', 'reset'],
        expect.any(Object)
      )
    })

    it('should execute nselfDbReset with force', async () => {
      const result = await nselfCLI.nselfDbReset({ force: true })
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['db', 'reset', '--force'],
        expect.any(Object)
      )
    })

    it('should execute nselfDbAnalyze', async () => {
      const result = await nselfCLI.nselfDbAnalyze()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['db', 'analyze'],
        expect.any(Object)
      )
    })
  })

  describe('Deployment Commands', () => {
    it('should execute nselfDeploy', async () => {
      const result = await nselfCLI.nselfDeploy('staging')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['deploy', 'staging'],
        expect.any(Object)
      )
    })

    it('should execute nselfDeploy with options', async () => {
      const result = await nselfCLI.nselfDeploy('production', {
        branch: 'main',
        tag: 'v1.0.0',
      })
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['deploy', 'production', '--branch', 'main', '--tag', 'v1.0.0'],
        expect.any(Object)
      )
    })

    it('should execute nselfStagingDeploy', async () => {
      const result = await nselfCLI.nselfStagingDeploy()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['deploy', 'staging'],
        expect.any(Object)
      )
    })

    it('should execute nselfProdDeploy', async () => {
      const result = await nselfCLI.nselfProdDeploy()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['deploy', 'production'],
        expect.any(Object)
      )
    })
  })

  describe('SSL Commands', () => {
    it('should execute nselfSslGenerate', async () => {
      const result = await nselfCLI.nselfSslGenerate()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['ssl', 'generate'],
        expect.any(Object)
      )
    })

    it('should execute nselfSslGenerate with domain', async () => {
      const result = await nselfCLI.nselfSslGenerate('example.com')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['ssl', 'generate', '--domain', 'example.com'],
        expect.any(Object)
      )
    })

    it('should execute nselfSslTrust', async () => {
      const result = await nselfCLI.nselfSslTrust()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['ssl', 'trust'],
        expect.any(Object)
      )
    })
  })

  describe('Build and Init Commands', () => {
    it('should execute nselfBuild', async () => {
      const result = await nselfCLI.nselfBuild()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['build'],
        expect.any(Object)
      )
    })

    it('should execute nselfBuild with force', async () => {
      const result = await nselfCLI.nselfBuild({ force: true })
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['build', '--force'],
        expect.any(Object)
      )
    })

    it('should execute nselfInit', async () => {
      const result = await nselfCLI.nselfInit()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['init'],
        expect.any(Object)
      )
    })

    it('should execute nselfInit with full', async () => {
      const result = await nselfCLI.nselfInit({ full: true })
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['init', '--full'],
        expect.any(Object)
      )
    })
  })

  describe('Utility Commands', () => {
    it('should execute nselfUpdate', async () => {
      const result = await nselfCLI.nselfUpdate()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['update'],
        expect.any(Object)
      )
    })

    it('should execute nselfVersion', async () => {
      const result = await nselfCLI.nselfVersion()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['version'],
        expect.any(Object)
      )
    })

    it('should execute nselfHelp', async () => {
      const result = await nselfCLI.nselfHelp()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['help'],
        expect.any(Object)
      )
    })

    it('should execute nselfHelp with command', async () => {
      const result = await nselfCLI.nselfHelp('build')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['help', 'build'],
        expect.any(Object)
      )
    })

    it('should execute nselfMonitor', async () => {
      const result = await nselfCLI.nselfMonitor()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['monitor'],
        expect.any(Object)
      )
    })

    it('should execute nselfMonitor with action', async () => {
      const result = await nselfCLI.nselfMonitor('enable')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['monitor', '--enable'],
        expect.any(Object)
      )
    })

    it('should execute nselfUrls', async () => {
      const result = await nselfCLI.nselfUrls()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['urls'],
        expect.any(Object)
      )
    })

    it('should execute nselfUrls with format', async () => {
      const result = await nselfCLI.nselfUrls('json')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['urls', '--format', 'json'],
        expect.any(Object)
      )
    })

    it('should execute nselfSecrets', async () => {
      const result = await nselfCLI.nselfSecrets('generate')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['secrets', 'generate'],
        expect.any(Object)
      )
    })

    it('should execute nselfSecrets with service', async () => {
      const result = await nselfCLI.nselfSecrets('rotate', 'postgres')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['secrets', 'rotate', 'postgres'],
        expect.any(Object)
      )
    })

    it('should execute nselfExport', async () => {
      const result = await nselfCLI.nselfExport('compose')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['export', '--format', 'compose'],
        expect.any(Object)
      )
    })

    it('should execute nselfExport with output path', async () => {
      const result = await nselfCLI.nselfExport('kubernetes', '/tmp/k8s.yaml')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['export', '--format', 'kubernetes', '--output', '/tmp/k8s.yaml'],
        expect.any(Object)
      )
    })

    it('should execute nselfScale', async () => {
      const result = await nselfCLI.nselfScale('api', 3)
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['scale', 'api', '3'],
        expect.any(Object)
      )
    })

    it('should execute nselfHealth', async () => {
      const result = await nselfCLI.nselfHealth()
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['health', '--all'],
        expect.any(Object)
      )
    })

    it('should execute nselfHealth with service', async () => {
      const result = await nselfCLI.nselfHealth('postgres')
      expect(result.success).toBe(true)
      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['health', 'postgres'],
        expect.any(Object)
      )
    })
  })

  describe('streamNselfCommand', () => {
    beforeEach(() => {
      // Reset spawn mock for streaming tests
      const { spawn } = require('child_process')
      spawn.mockClear()
    })

    it('should reject invalid streaming commands', () => {
      expect(() => {
        nselfCLI.streamNselfCommand('build' as 'logs', [], () => {})
      }).toThrow('Invalid streaming command')
    })

    it('should accept valid streaming commands', () => {
      const { spawn } = require('child_process')
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
      }
      spawn.mockReturnValue(mockProcess)

      const kill = nselfCLI.streamNselfCommand('logs', ['postgres'], () => {})
      expect(typeof kill).toBe('function')
    })

    it('should call onData callback', () => {
      const onData = jest.fn()
      const onError = jest.fn()
      const onClose = jest.fn()

      const { spawn } = require('child_process')
      let stdoutCallback: (data: string) => void
      let stderrCallback: (data: string) => void
      let closeCallback: (code: number) => void

      const mockProcess = {
        stdout: {
          on: jest.fn((event: string, cb: (data: string) => void) => {
            if (event === 'data') {
              stdoutCallback = cb
            }
          }),
        },
        stderr: {
          on: jest.fn((event: string, cb: (data: string) => void) => {
            if (event === 'data') {
              stderrCallback = cb
            }
          }),
        },
        on: jest.fn((event: string, cb: (code: number) => void) => {
          if (event === 'close') {
            closeCallback = cb
          }
        }),
        kill: jest.fn(),
      }
      spawn.mockReturnValue(mockProcess)

      nselfCLI.streamNselfCommand('logs', [], onData, onError, onClose)

      // Simulate data events
      stdoutCallback!('log line 1\n')
      stderrCallback!('error line\n')
      closeCallback!(0)

      expect(onData).toHaveBeenCalledWith('log line 1\n')
      expect(onError).toHaveBeenCalledWith('error line\n')
      expect(onClose).toHaveBeenCalledWith(0)
    })

    it('should return kill function that stops the process', () => {
      const { spawn } = require('child_process')
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
      }
      spawn.mockReturnValue(mockProcess)

      const kill = nselfCLI.streamNselfCommand('logs', [], () => {})
      kill()

      expect(mockProcess.kill).toHaveBeenCalled()
    })
  })

  describe('Security and Validation', () => {
    it('should only allow whitelisted commands', async () => {
      const invalidCommands = ['rm', 'cat', 'ls', 'sudo']

      for (const cmd of invalidCommands) {
        const result = await nselfCLI.executeNselfCommand(cmd as 'status')
        expect(result.success).toBe(false)
        expect(result.error).toContain('Invalid nself command')
      }
    })

    it('should allow exec command which is in the whitelist', async () => {
      const result = await nselfCLI.executeNselfCommand('exec')
      expect(result.success).toBe(true)
    })

    it('should sanitize arguments', async () => {
      // These should be filtered out
      await nselfCLI.executeNselfCommand('status', [
        '',
        null as unknown as string,
        undefined as unknown as string,
      ])

      expect(mockExecFile).toHaveBeenCalledWith(
        '/usr/local/bin/nself',
        ['status'],
        expect.any(Object)
      )
    })
  })
})
