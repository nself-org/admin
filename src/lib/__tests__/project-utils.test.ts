// Mock functions for fs
const mockExistsSync = jest.fn()
const mockReaddirSync = jest.fn()

// Mock function for execAsync (promisified exec)
const mockExecAsync = jest.fn()

// Set up mocks before any imports
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
}))

jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn(() => mockExecAsync),
}))

jest.mock('child_process')

jest.mock('../database', () => ({
  getCachedProjectInfo: jest.fn(() => Promise.resolve(null)),
  setCachedProjectInfo: jest.fn(() => Promise.resolve()),
}))

jest.mock('../paths', () => ({
  getProjectPath: jest.fn(() => '/test/project'),
}))

describe('project-utils', () => {
  let projectUtils: typeof import('../project-utils')

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()

    // Reset default mock behavior
    mockExistsSync.mockReturnValue(true)
    mockReaddirSync.mockReturnValue([])
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' })

    // Re-import module to get fresh instance with mocks
    projectUtils = require('../project-utils')
  })

  describe('checkProjectStatus', () => {
    it('returns not_initialized if directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false)

      const result = await projectUtils.checkProjectStatus()

      expect(result.status).toBe('not_initialized')
      expect(result.error).toBe('Project directory does not exist')
    })

    it('returns not_initialized if directory is empty', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([])

      const result = await projectUtils.checkProjectStatus()

      expect(result.status).toBe('not_initialized')
    })

    it('returns initialized if docker-compose.yml missing', async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (String(path).includes('docker-compose.yml')) return false
        return true
      })
      mockReaddirSync.mockReturnValue(['.env'])

      const result = await projectUtils.checkProjectStatus()

      expect(result.status).toBe('initialized')
    })

    it('returns built if docker-compose exists but no containers running', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['docker-compose.yml'])
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' })

      const result = await projectUtils.checkProjectStatus()

      expect(result.status).toBe('built')
    })

    it('returns running if containers are active', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['docker-compose.yml'])
      // Return container names that include 'nself' or 'postgres' to match the filter
      mockExecAsync.mockResolvedValue({
        stdout: 'nself-postgres\nnself-hasura\n',
        stderr: '',
      })

      const result = await projectUtils.checkProjectStatus()

      expect(result.status).toBe('running')
    })
  })

  describe('getProjectServices', () => {
    it('returns empty array if docker-compose.yml missing', async () => {
      mockExistsSync.mockReturnValue(false)

      const result = await projectUtils.getProjectServices()

      expect(result.services).toEqual([])
      expect(result.error).toBe('docker-compose.yml not found')
    })

    it('returns services from docker-compose config', async () => {
      mockExistsSync.mockReturnValue(true)
      mockExecAsync.mockResolvedValue({
        stdout: 'postgres\nhasura\nredis\n',
        stderr: '',
      })

      const result = await projectUtils.getProjectServices()

      expect(result.services).toEqual(['postgres', 'hasura', 'redis'])
    })

    it('handles docker-compose errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true)
      mockExecAsync.mockRejectedValue(new Error('docker-compose failed'))

      const result = await projectUtils.getProjectServices()

      expect(result.services).toEqual([])
      expect(result.error).toBe('Failed to read services from docker-compose')
    })
  })

  describe('getRunningContainers', () => {
    it('returns count of running containers', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '5\n', stderr: '' })

      const count = await projectUtils.getRunningContainers()

      expect(count).toBe(5)
    })

    it('returns 0 if docker command fails', async () => {
      mockExecAsync.mockRejectedValue(new Error('docker not running'))

      const count = await projectUtils.getRunningContainers()

      expect(count).toBe(0)
    })

    it('returns 0 if count is NaN', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'invalid\n', stderr: '' })

      const count = await projectUtils.getRunningContainers()

      expect(count).toBe(0)
    })
  })

  describe('getDockerStatus', () => {
    it('returns docker status with containers', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'ID\tNAMES\tSTATE\tSTATUS\nabc123\tpostgres\trunning\tUp 5 minutes\n',
        stderr: '',
      })

      const status = await projectUtils.getDockerStatus()

      expect(status.running).toBe(true)
      expect(status.containers).toHaveLength(1)
      expect(status.containers[0].name).toBe('postgres')
      expect(status.error).toBeNull()
    })

    it('returns empty status if docker fails', async () => {
      mockExecAsync.mockRejectedValue(new Error('Docker daemon not running'))

      const status = await projectUtils.getDockerStatus()

      expect(status.running).toBe(false)
      expect(status.containers).toEqual([])
      expect(status.error).toBeTruthy()
    })
  })
})
