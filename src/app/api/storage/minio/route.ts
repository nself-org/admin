import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

const execFileAsync = promisify(execFile)

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'storage.nae.local'
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin'
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin'

const _MINIO_ENDPOINT = MINIO_ENDPOINT
const _MINIO_ACCESS_KEY = MINIO_ACCESS_KEY
const _MINIO_SECRET_KEY = MINIO_SECRET_KEY

// Strict validation patterns for safe inputs
const SAFE_BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/
const SAFE_OBJECT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_\-./]{0,254}$/
const SAFE_USER_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{2,62}$/
const SAFE_POLICY_PATTERN = /^(none|download|upload|public|private|readwrite)$/

function validateBucketName(input: string): boolean {
  return (
    SAFE_BUCKET_PATTERN.test(input) &&
    !input.includes('..') &&
    !input.startsWith('-') &&
    !input.endsWith('-')
  )
}

function validateObjectName(input: string): boolean {
  return (
    SAFE_OBJECT_PATTERN.test(input) &&
    !input.includes('..') &&
    !input.includes('//') &&
    !input.startsWith('/')
  )
}

function validateUserName(input: string): boolean {
  return SAFE_USER_PATTERN.test(input) && !input.includes('..')
}

function validatePolicy(input: string): boolean {
  return SAFE_POLICY_PATTERN.test(input)
}

function validatePassword(input: string): boolean {
  // Password must be 8-40 chars, no shell metacharacters
  return (
    input.length >= 8 && input.length <= 40 && !/[;&|`$(){}[\]<>\\]/.test(input)
  )
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'buckets'
    const bucket = searchParams.get('bucket')
    const prefix = searchParams.get('prefix')

    // Validate bucket if provided
    if (bucket && !validateBucketName(bucket)) {
      return NextResponse.json(
        { success: false, error: 'Invalid bucket name' },
        { status: 400 },
      )
    }

    // Validate prefix if provided
    if (prefix && !validateObjectName(prefix)) {
      return NextResponse.json(
        { success: false, error: 'Invalid prefix' },
        { status: 400 },
      )
    }

    switch (action) {
      case 'buckets':
        return await getBuckets()
      case 'objects':
        return await getObjects(bucket || undefined, prefix || undefined)
      case 'info':
        return await getStorageInfo()
      case 'policies':
        return await getPolicies(bucket || undefined)
      case 'users':
        return await getUsers()
      case 'stats':
        return await getStorageStats()
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Storage operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { action, bucket, object, policy, user, password, content } = body

    // Validate bucket if provided
    if (bucket && !validateBucketName(bucket)) {
      return NextResponse.json(
        { success: false, error: 'Invalid bucket name' },
        { status: 400 },
      )
    }

    // Validate object if provided
    if (object && !validateObjectName(object)) {
      return NextResponse.json(
        { success: false, error: 'Invalid object name' },
        { status: 400 },
      )
    }

    // Validate user if provided
    if (user && !validateUserName(user)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user name' },
        { status: 400 },
      )
    }

    // Validate policy if provided
    if (policy && !validatePolicy(policy)) {
      return NextResponse.json(
        { success: false, error: 'Invalid policy' },
        { status: 400 },
      )
    }

    // Validate password if provided
    if (password && !validatePassword(password)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid password. Must be 8-40 characters without shell metacharacters.',
        },
        { status: 400 },
      )
    }

    switch (action) {
      case 'createBucket':
        return await createBucket(bucket)
      case 'deleteBucket':
        return await deleteBucket(bucket)
      case 'uploadObject':
        return await uploadObject(bucket, object, content)
      case 'deleteObject':
        return await deleteObject(bucket, object)
      case 'setPolicy':
        return await setPolicy(bucket, policy)
      case 'createUser':
        return await createUser(user, password)
      case 'deleteUser':
        return await deleteUser(user)
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Storage operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getBuckets() {
  const { stdout } = await execFileAsync(
    'docker',
    ['exec', 'nself_minio', 'mc', 'ls', 'minio', '--json'],
    { timeout: 30000 },
  )

  const buckets = stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        const data = JSON.parse(line)
        return {
          name: data.key,
          created: data.lastModified,
          size: data.size || 0,
          type: data.type,
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)

  const bucketDetails = await Promise.all(
    buckets.map(async (bucket: { name: string } | null) => {
      if (!bucket) return null
      try {
        const { stdout: statOutput } = await execFileAsync(
          'docker',
          [
            'exec',
            'nself_minio',
            'mc',
            'stat',
            `minio/${bucket.name}`,
            '--json',
          ],
          { timeout: 30000 },
        )
        const stat = JSON.parse(statOutput)

        const { stdout: duOutput } = await execFileAsync(
          'docker',
          ['exec', 'nself_minio', 'mc', 'du', `minio/${bucket.name}`, '--json'],
          { timeout: 30000 },
        )
        // Get last line of output
        const duLines = duOutput.trim().split('\n')
        const du = JSON.parse(duLines[duLines.length - 1] || '{}')

        return {
          ...bucket,
          objects: du.objects || 0,
          totalSize: du.size || 0,
          versioning: stat.metadata?.versioning || false,
          encryption: stat.metadata?.encryption || false,
        }
      } catch {
        return bucket
      }
    }),
  )

  return NextResponse.json({
    success: true,
    data: {
      buckets: bucketDetails.filter(Boolean),
      total: bucketDetails.filter(Boolean).length,
      timestamp: new Date().toISOString(),
    },
  })
}

async function getObjects(bucket?: string, prefix?: string) {
  if (!bucket) {
    return NextResponse.json(
      { success: false, error: 'Bucket name is required' },
      { status: 400 },
    )
  }

  const objectPath = prefix ? `minio/${bucket}/${prefix}` : `minio/${bucket}`
  const { stdout } = await execFileAsync(
    'docker',
    ['exec', 'nself_minio', 'mc', 'ls', objectPath, '--json'],
    { timeout: 30000 },
  )

  const objects = stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        const data = JSON.parse(line)
        return {
          name: data.key,
          size: data.size,
          lastModified: data.lastModified,
          etag: data.etag,
          type: data.type,
          storageClass: data.storageClass,
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)

  return NextResponse.json({
    success: true,
    data: {
      bucket,
      prefix,
      objects,
      total: objects.length,
      timestamp: new Date().toISOString(),
    },
  })
}

async function getStorageInfo() {
  try {
    const { stdout: adminInfo } = await execFileAsync(
      'docker',
      ['exec', 'nself_minio', 'mc', 'admin', 'info', 'minio', '--json'],
      { timeout: 30000 },
    )

    const info = JSON.parse(adminInfo)

    const { stdout: diskUsage } = await execFileAsync(
      'docker',
      ['exec', 'nself_minio', 'mc', 'admin', 'disk', 'minio', '--json'],
      { timeout: 30000 },
    )

    // Get first line
    const diskLines = diskUsage.trim().split('\n')
    const disk = JSON.parse(diskLines[0] || '{}')

    return NextResponse.json({
      success: true,
      data: {
        server: {
          version: info.info?.version || 'unknown',
          uptime: info.info?.uptime || 0,
          region: info.info?.region || 'us-east-1',
          sqsARN: info.info?.sqsARN || [],
        },
        storage: {
          used: disk.usedSpace || 0,
          available: disk.availableSpace || 0,
          total: (disk.usedSpace || 0) + (disk.availableSpace || 0),
          usage: disk.usage || 0,
        },
        network: {
          endpoint: MINIO_ENDPOINT,
          secure: true,
        },
        buckets: info.info?.buckets || 0,
        objects: info.info?.objects || 0,
        timestamp: new Date().toISOString(),
      },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        server: {
          version: 'RELEASE.2023',
          uptime: Date.now(),
          region: 'us-east-1',
        },
        storage: {
          used: 0,
          available: 0,
          total: 0,
          usage: 0,
        },
        network: {
          endpoint: MINIO_ENDPOINT,
          secure: true,
        },
        buckets: 0,
        objects: 0,
        timestamp: new Date().toISOString(),
      },
    })
  }
}

async function getPolicies(bucket?: string) {
  try {
    if (bucket) {
      const { stdout } = await execFileAsync(
        'docker',
        [
          'exec',
          'nself_minio',
          'mc',
          'policy',
          'get',
          `minio/${bucket}`,
          '--json',
        ],
        { timeout: 30000 },
      )

      return NextResponse.json({
        success: true,
        data: {
          bucket,
          policy: JSON.parse(stdout || '{}'),
          timestamp: new Date().toISOString(),
        },
      })
    } else {
      const { stdout } = await execFileAsync(
        'docker',
        [
          'exec',
          'nself_minio',
          'mc',
          'admin',
          'policy',
          'list',
          'minio',
          '--json',
        ],
        { timeout: 30000 },
      )

      const policies = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter(Boolean)

      return NextResponse.json({
        success: true,
        data: {
          policies,
          total: policies.length,
          timestamp: new Date().toISOString(),
        },
      })
    }
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        policies: [],
        total: 0,
        timestamp: new Date().toISOString(),
      },
    })
  }
}

async function getUsers() {
  try {
    const { stdout } = await execFileAsync(
      'docker',
      ['exec', 'nself_minio', 'mc', 'admin', 'user', 'list', 'minio', '--json'],
      { timeout: 30000 },
    )

    const users = stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          const data = JSON.parse(line)
          return {
            accessKey: data.accessKey,
            status: data.userStatus,
            policyName: data.policyName,
          }
        } catch {
          return null
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      data: {
        users,
        total: users.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        users: [
          {
            accessKey: MINIO_ACCESS_KEY,
            status: 'enabled',
            policyName: 'consoleAdmin',
          },
        ],
        total: 1,
        timestamp: new Date().toISOString(),
      },
    })
  }
}

async function getStorageStats() {
  try {
    const { stdout: prometheus } = await execFileAsync(
      'docker',
      ['exec', 'nself_minio', 'mc', 'admin', 'prometheus', 'metrics', 'minio'],
      { timeout: 30000 },
    )

    // Only take first 50 lines
    const lines = prometheus.split('\n').slice(0, 50)
    const metrics: Record<string, number> = {}
    lines.forEach((line) => {
      if (!line.startsWith('#') && line.includes(' ')) {
        const [key, value] = line.split(' ')
        if (key && value) {
          metrics[key] = parseFloat(value)
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        requests: {
          total: metrics['minio_http_requests_total'] || 0,
          errors: metrics['minio_http_requests_errors_total'] || 0,
          duration: metrics['minio_http_requests_duration_seconds'] || 0,
        },
        storage: {
          totalBytes: metrics['minio_disk_storage_total_bytes'] || 0,
          usedBytes: metrics['minio_disk_storage_used_bytes'] || 0,
          availableBytes: metrics['minio_disk_storage_available_bytes'] || 0,
          freeInodes: metrics['minio_disk_storage_free_inodes'] || 0,
        },
        network: {
          receivedBytes:
            metrics['minio_inter_node_traffic_received_bytes'] || 0,
          sentBytes: metrics['minio_inter_node_traffic_sent_bytes'] || 0,
        },
        s3: {
          requestsTotal: metrics['minio_s3_requests_total'] || 0,
          errorsTotal: metrics['minio_s3_requests_errors_total'] || 0,
          ttfbSeconds: metrics['minio_s3_requests_ttfb_seconds'] || 0,
        },
        timestamp: new Date().toISOString(),
      },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        requests: { total: 0, errors: 0, duration: 0 },
        storage: {
          totalBytes: 0,
          usedBytes: 0,
          availableBytes: 0,
          freeInodes: 0,
        },
        network: { receivedBytes: 0, sentBytes: 0 },
        s3: { requestsTotal: 0, errorsTotal: 0, ttfbSeconds: 0 },
        timestamp: new Date().toISOString(),
      },
    })
  }
}

async function createBucket(bucket: string) {
  if (!bucket) {
    return NextResponse.json(
      { success: false, error: 'Bucket name is required' },
      { status: 400 },
    )
  }

  const { stdout } = await execFileAsync(
    'docker',
    ['exec', 'nself_minio', 'mc', 'mb', `minio/${bucket}`],
    { timeout: 30000 },
  )

  return NextResponse.json({
    success: true,
    data: {
      bucket,
      result: stdout.trim(),
      timestamp: new Date().toISOString(),
    },
  })
}

async function deleteBucket(bucket: string) {
  if (!bucket) {
    return NextResponse.json(
      { success: false, error: 'Bucket name is required' },
      { status: 400 },
    )
  }

  const { stdout } = await execFileAsync(
    'docker',
    ['exec', 'nself_minio', 'mc', 'rb', `minio/${bucket}`, '--force'],
    { timeout: 30000 },
  )

  return NextResponse.json({
    success: true,
    data: {
      bucket,
      result: stdout.trim(),
      timestamp: new Date().toISOString(),
    },
  })
}

async function uploadObject(bucket: string, object: string, content: string) {
  if (!bucket || !object || !content) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bucket, object name, and content are required',
      },
      { status: 400 },
    )
  }

  // Create a safe temp file name using timestamp
  const tempFile = `/tmp/${Date.now()}_upload`

  // Write content using printf in docker (safer than echo with quotes)
  await execFileAsync(
    'docker',
    [
      'exec',
      'nself_minio',
      'sh',
      '-c',
      `printf '%s' "$1" > ${tempFile}`,
      '--',
      content,
    ],
    { timeout: 30000 },
  )

  const { stdout } = await execFileAsync(
    'docker',
    ['exec', 'nself_minio', 'mc', 'cp', tempFile, `minio/${bucket}/${object}`],
    { timeout: 30000 },
  )

  // Clean up temp file
  await execFileAsync('docker', ['exec', 'nself_minio', 'rm', tempFile], {
    timeout: 10000,
  }).catch(() => {
    // Ignore cleanup errors
  })

  return NextResponse.json({
    success: true,
    data: {
      bucket,
      object,
      size: content.length,
      result: stdout.trim(),
      timestamp: new Date().toISOString(),
    },
  })
}

async function deleteObject(bucket: string, object: string) {
  if (!bucket || !object) {
    return NextResponse.json(
      { success: false, error: 'Bucket and object name are required' },
      { status: 400 },
    )
  }

  const { stdout } = await execFileAsync(
    'docker',
    ['exec', 'nself_minio', 'mc', 'rm', `minio/${bucket}/${object}`],
    { timeout: 30000 },
  )

  return NextResponse.json({
    success: true,
    data: {
      bucket,
      object,
      result: stdout.trim(),
      timestamp: new Date().toISOString(),
    },
  })
}

async function setPolicy(bucket: string, policy: string) {
  if (!bucket || !policy) {
    return NextResponse.json(
      { success: false, error: 'Bucket and policy are required' },
      { status: 400 },
    )
  }

  const { stdout } = await execFileAsync(
    'docker',
    ['exec', 'nself_minio', 'mc', 'policy', 'set', policy, `minio/${bucket}`],
    { timeout: 30000 },
  )

  return NextResponse.json({
    success: true,
    data: {
      bucket,
      policy,
      result: stdout.trim(),
      timestamp: new Date().toISOString(),
    },
  })
}

async function createUser(user: string, password: string) {
  if (!user || !password) {
    return NextResponse.json(
      { success: false, error: 'User and password are required' },
      { status: 400 },
    )
  }

  const { stdout } = await execFileAsync(
    'docker',
    [
      'exec',
      'nself_minio',
      'mc',
      'admin',
      'user',
      'add',
      'minio',
      user,
      password,
    ],
    { timeout: 30000 },
  )

  return NextResponse.json({
    success: true,
    data: {
      user,
      result: stdout.trim(),
      timestamp: new Date().toISOString(),
    },
  })
}

async function deleteUser(user: string) {
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'User is required' },
      { status: 400 },
    )
  }

  const { stdout } = await execFileAsync(
    'docker',
    ['exec', 'nself_minio', 'mc', 'admin', 'user', 'remove', 'minio', user],
    { timeout: 30000 },
  )

  return NextResponse.json({
    success: true,
    data: {
      user,
      result: stdout.trim(),
      timestamp: new Date().toISOString(),
    },
  })
}
