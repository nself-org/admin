import { readEnvFile } from '@/lib/env-handler'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import * as Minio from 'minio'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ---------------------------------------------------------------------------
// MinIO client factory
// ---------------------------------------------------------------------------

async function getMinIOClient(): Promise<Minio.Client> {
  // Read credentials from the project's .env files
  const env = (await readEnvFile()) ?? {}

  const endPoint = env.MINIO_HOST || 'localhost'
  const port = parseInt(env.MINIO_PORT || env.STORAGE_PORT || '9000', 10)
  const accessKey = env.MINIO_ROOT_USER || env.MINIO_ACCESS_KEY || 'minioadmin'
  const secretKey =
    env.MINIO_ROOT_PASSWORD || env.MINIO_SECRET_KEY || 'minioadmin'

  return new Minio.Client({
    endPoint,
    port,
    useSSL: false,
    accessKey,
    secretKey,
  })
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'overview'
    const bucketName = searchParams.get('bucket')
    const filePath = searchParams.get('path') || '/'

    switch (action) {
      case 'overview':
        return await getStorageOverview()
      case 'buckets':
        return await listBuckets()
      case 'files':
        if (!bucketName) {
          return NextResponse.json(
            {
              success: false,
              error: 'Bucket name is required for files action',
            },
            { status: 400 },
          )
        }
        return await listFiles(bucketName, filePath)
      case 'usage':
        return await getStorageUsage()
      case 'stats':
        return await getStorageStats()
      case 'download':
        if (!bucketName || !searchParams.get('file')) {
          return NextResponse.json(
            { success: false, error: 'Bucket name and file path are required' },
            { status: 400 },
          )
        }
        return await downloadFile(bucketName, searchParams.get('file')!)
      case 'file-info':
        if (!bucketName || !searchParams.get('file')) {
          return NextResponse.json(
            { success: false, error: 'Bucket name and file path are required' },
            { status: 400 },
          )
        }
        return await getFileInfo(bucketName, searchParams.get('file')!)
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

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { action, bucket, file, options = {} } = await request.json()

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 },
      )
    }

    switch (action) {
      case 'create-bucket':
        if (!bucket) {
          return NextResponse.json(
            { success: false, error: 'Bucket name is required' },
            { status: 400 },
          )
        }
        return await createBucket(bucket, options)
      case 'delete-bucket':
        if (!bucket) {
          return NextResponse.json(
            { success: false, error: 'Bucket name is required' },
            { status: 400 },
          )
        }
        return await deleteBucket(bucket, options)
      case 'upload-file':
        if (!bucket || !file) {
          return NextResponse.json(
            { success: false, error: 'Bucket name and file are required' },
            { status: 400 },
          )
        }
        return await uploadFile(bucket, file, options)
      case 'delete-file':
        if (!bucket || !file) {
          return NextResponse.json(
            { success: false, error: 'Bucket name and file path are required' },
            { status: 400 },
          )
        }
        return await deleteFile(bucket, file)
      case 'copy-file':
        return await copyFile(options)
      case 'move-file':
        return await moveFile(options)
      case 'create-folder':
        if (!bucket || !options.folderName) {
          return NextResponse.json(
            {
              success: false,
              error: 'Bucket name and folder name are required',
            },
            { status: 400 },
          )
        }
        return await createFolder(
          bucket,
          options.folderName,
          options.path || '/',
        )
      case 'set-permissions':
        return await setFilePermissions(bucket, file, options)
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

// ---------------------------------------------------------------------------
// GET action handlers
// ---------------------------------------------------------------------------

async function getStorageOverview() {
  try {
    const backendPath = getProjectPath()

    // Check if MinIO container is running
    const { stdout: minioStatus } = await execAsync(
      `cd "${backendPath}" && docker compose ps --format json minio 2>/dev/null || docker-compose ps minio 2>/dev/null || echo ""`,
    ).catch(() => ({ stdout: '' }))

    const isMinioRunning =
      minioStatus.includes('"running"') ||
      minioStatus.includes('Up') ||
      minioStatus.includes('running')

    let overview = {
      minio: {
        status: isMinioRunning ? 'running' : 'stopped',
        version: 'Unknown',
        endpoint: 'http://localhost:9000',
        console: 'http://localhost:9001',
      },
      buckets: [] as ReturnType<typeof buildBucketShape>[],
      usage: { total: 0, used: 0, available: 0, percentage: 0 },
      stats: { files: 0, folders: 0, totalSize: 0 },
    }

    if (isMinioRunning) {
      const [buckets, usage, stats] = await Promise.all([
        getMinIOBuckets(),
        getMinIOUsage(),
        getMinIOStats(),
      ])

      overview = {
        minio: {
          status: 'running',
          version: 'Latest',
          endpoint: 'http://localhost:9000',
          console: 'http://localhost:9001',
        },
        buckets,
        usage,
        stats,
      }
    }

    const projectStorage = await getProjectFileStorage()

    return NextResponse.json({
      success: true,
      data: {
        overview,
        projectStorage,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get storage overview',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function listBuckets() {
  try {
    const client = await getMinIOClient()
    const rawBuckets = await client.listBuckets()

    const buckets = rawBuckets.map((b) => ({
      name: b.name,
      created: b.creationDate.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: {
        buckets,
        total: buckets.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list buckets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function listFiles(bucketName: string, filePath: string) {
  try {
    const client = await getMinIOClient()

    // Normalise prefix: strip leading slash, ensure trailing slash for dirs
    let prefix = filePath.replace(/^\/+/, '')
    if (prefix && !prefix.endsWith('/')) prefix += '/'

    const files: {
      name: string
      size: number
      modified: string
      type: 'file' | 'folder'
      etag?: string
    }[] = []

    const stream = client.listObjectsV2(bucketName, prefix, false)

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (obj: Minio.BucketItem) => {
        if (obj.prefix) {
          // Folder entry
          files.push({
            name: obj.prefix,
            size: 0,
            modified: '',
            type: 'folder',
          })
        } else {
          files.push({
            name: obj.name ?? '',
            size: obj.size ?? 0,
            modified: obj.lastModified?.toISOString() ?? '',
            type: 'file',
            etag: obj.etag,
          })
        }
      })
      stream.on('error', reject)
      stream.on('end', resolve)
    })

    return NextResponse.json({
      success: true,
      data: {
        bucket: bucketName,
        path: filePath,
        files,
        total: files.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to list files in bucket '${bucketName}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getStorageUsage() {
  try {
    const [minioUsage, projectUsage] = await Promise.all([
      getMinIOUsage(),
      getProjectDirectoryUsage(),
    ])

    // Docker volume usage
    const { stdout: volumeStdout } = await execAsync(
      `docker system df -v 2>/dev/null | grep -i volume || echo ""`,
    ).catch(() => ({ stdout: '' }))

    return NextResponse.json({
      success: true,
      data: {
        minio: minioUsage,
        volumes: parseVolumeUsage(volumeStdout),
        project: projectUsage,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get storage usage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getStorageStats() {
  try {
    const buckets = await getMinIOBuckets()

    const aggregated = {
      totalFiles: 0,
      totalFolders: 0,
      totalSize: 0,
      buckets: buckets.length,
      largestFile: { name: '', size: 0 },
      fileTypes: {} as Record<string, number>,
    }

    for (const bucket of buckets) {
      const stats = await getBucketStats(bucket.name)
      aggregated.totalFiles += stats.files
      aggregated.totalFolders += stats.folders
      aggregated.totalSize += stats.size

      if (stats.largestFile.size > aggregated.largestFile.size) {
        aggregated.largestFile = stats.largestFile
      }

      for (const [ext, count] of Object.entries(stats.fileTypes)) {
        aggregated.fileTypes[ext] = (aggregated.fileTypes[ext] ?? 0) + count
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        stats: aggregated,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get storage stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function downloadFile(bucket: string, filePath: string) {
  try {
    const client = await getMinIOClient()

    // Generate a presigned GET URL valid for 15 minutes
    const url = await client.presignedGetObject(bucket, filePath, 15 * 60)

    return NextResponse.json({
      success: true,
      data: {
        bucket,
        file: filePath,
        download_url: url,
        expires_in: 900,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate download URL for '${filePath}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getFileInfo(bucket: string, filePath: string) {
  try {
    const client = await getMinIOClient()
    const stat = await client.statObject(bucket, filePath)

    return NextResponse.json({
      success: true,
      data: {
        bucket,
        file: filePath,
        size: stat.size,
        lastModified: stat.lastModified.toISOString(),
        etag: stat.etag,
        contentType:
          stat.metaData?.['content-type'] ?? 'application/octet-stream',
        metadata: stat.metaData,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to get file info for '${filePath}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// POST action handlers
// ---------------------------------------------------------------------------

async function createBucket(bucketName: string, options: { policy?: string }) {
  try {
    // Validate bucket name (S3 rules)
    if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucketName)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid bucket name. Use 3-63 lowercase letters, numbers, dots or hyphens.',
        },
        { status: 400 },
      )
    }

    const client = await getMinIOClient()

    const exists = await client.bucketExists(bucketName)
    if (exists) {
      return NextResponse.json(
        { success: false, error: `Bucket '${bucketName}' already exists` },
        { status: 409 },
      )
    }

    await client.makeBucket(bucketName)

    // Apply bucket policy if requested
    if (options.policy === 'public') {
      const publicPolicy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      })
      await client.setBucketPolicy(bucketName, publicPolicy)
    }

    return NextResponse.json({
      success: true,
      data: {
        bucket: bucketName,
        policy: options.policy || 'private',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to create bucket '${bucketName}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function deleteBucket(bucketName: string, options: { force?: boolean }) {
  try {
    const client = await getMinIOClient()

    if (options.force) {
      // Remove all objects first
      const objectsList: string[] = []
      const stream = client.listObjectsV2(bucketName, '', true)

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (obj: Minio.BucketItem) => {
          if (obj.name) objectsList.push(obj.name)
        })
        stream.on('error', reject)
        stream.on('end', resolve)
      })

      if (objectsList.length > 0) {
        await client.removeObjects(bucketName, objectsList)
      }
    }

    await client.removeBucket(bucketName)

    return NextResponse.json({
      success: true,
      data: {
        bucket: bucketName,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to delete bucket '${bucketName}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function uploadFile(
  bucket: string,
  file: {
    name?: string
    content?: string
    contentType?: string
    size?: number
  },
  _options: unknown,
) {
  try {
    if (!file.name || !file.content) {
      return NextResponse.json(
        {
          success: false,
          error: 'File name and base64-encoded content are required',
        },
        { status: 400 },
      )
    }

    const client = await getMinIOClient()

    // Content arrives as base64 string
    const buffer = Buffer.from(file.content, 'base64')
    const contentType = file.contentType ?? 'application/octet-stream'

    const etag = await client.putObject(
      bucket,
      file.name,
      buffer,
      buffer.length,
      {
        'Content-Type': contentType,
      },
    )

    return NextResponse.json({
      success: true,
      data: {
        bucket,
        file: file.name,
        size: buffer.length,
        etag: etag.etag,
        contentType,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to upload file to bucket '${bucket}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function deleteFile(bucket: string, filePath: string) {
  try {
    const client = await getMinIOClient()
    await client.removeObject(bucket, filePath)

    return NextResponse.json({
      success: true,
      data: {
        bucket,
        file: filePath,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to delete file '${filePath}' from bucket '${bucket}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function createFolder(
  bucket: string,
  folderName: string,
  parentPath: string,
) {
  try {
    const client = await getMinIOClient()

    // Normalise paths
    const normalised = parentPath.replace(/^\/+/, '').replace(/\/?$/, '/')
    const objectName =
      `${normalised}${folderName.replace(/\/?$/, '/')}`.replace(/^\/+/, '')

    // MinIO has no real folder concept — create a zero-byte placeholder
    const emptyBuffer = Buffer.alloc(0)
    await client.putObject(bucket, objectName, emptyBuffer, 0, {
      'Content-Type': 'application/x-directory',
    })

    return NextResponse.json({
      success: true,
      data: {
        bucket,
        folder: objectName,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to create folder '${folderName}' in bucket '${bucket}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function copyFile(options: {
  sourceBucket?: string
  sourceObject?: string
  destBucket?: string
  destObject?: string
}) {
  try {
    const { sourceBucket, sourceObject, destBucket, destObject } = options

    if (!sourceBucket || !sourceObject || !destBucket || !destObject) {
      return NextResponse.json(
        {
          success: false,
          error:
            'sourceBucket, sourceObject, destBucket, and destObject are required',
        },
        { status: 400 },
      )
    }

    const client = await getMinIOClient()
    const conds = new Minio.CopyConditions()
    await client.copyObject(
      destBucket,
      destObject,
      `/${sourceBucket}/${sourceObject}`,
      conds,
    )

    return NextResponse.json({
      success: true,
      data: {
        sourceBucket,
        sourceObject,
        destBucket,
        destObject,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to copy file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function moveFile(options: {
  sourceBucket?: string
  sourceObject?: string
  destBucket?: string
  destObject?: string
}) {
  try {
    const { sourceBucket, sourceObject, destBucket, destObject } = options

    if (!sourceBucket || !sourceObject || !destBucket || !destObject) {
      return NextResponse.json(
        {
          success: false,
          error:
            'sourceBucket, sourceObject, destBucket, and destObject are required',
        },
        { status: 400 },
      )
    }

    const client = await getMinIOClient()

    // Copy then delete — MinIO has no native move
    const conds = new Minio.CopyConditions()
    await client.copyObject(
      destBucket,
      destObject,
      `/${sourceBucket}/${sourceObject}`,
      conds,
    )
    await client.removeObject(sourceBucket, sourceObject)

    return NextResponse.json({
      success: true,
      data: {
        sourceBucket,
        sourceObject,
        destBucket,
        destObject,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to move file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function setFilePermissions(
  bucket: string,
  file: string,
  options: { isPublic?: boolean; policy?: string },
) {
  try {
    if (!bucket) {
      return NextResponse.json(
        { success: false, error: 'Bucket name is required' },
        { status: 400 },
      )
    }

    const client = await getMinIOClient()
    const makePublic = options.isPublic === true || options.policy === 'public'

    if (file) {
      // Object-level: set tag to mark public/private intent
      // (MinIO doesn't support per-object ACLs natively outside of tags)
      await client.setObjectTagging(bucket, file, {
        visibility: makePublic ? 'public' : 'private',
      })
    } else {
      // Bucket-level: set or remove public read policy
      if (makePublic) {
        const publicPolicy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        })
        await client.setBucketPolicy(bucket, publicPolicy)
      } else {
        // Remove policy (reverts to private)
        await client.setBucketPolicy(bucket, '')
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        bucket,
        file: file || null,
        visibility: makePublic ? 'public' : 'private',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to set permissions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// Helper / internal functions
// ---------------------------------------------------------------------------

function buildBucketShape(name: string, created: Date) {
  return { name, created: created.toISOString() }
}

async function getMinIOBuckets(): Promise<
  ReturnType<typeof buildBucketShape>[]
> {
  try {
    const client = await getMinIOClient()
    const buckets = await client.listBuckets()
    return buckets.map((b) => buildBucketShape(b.name, b.creationDate))
  } catch {
    return []
  }
}

async function getMinIOUsage(): Promise<{
  total: number
  used: number
  available: number
  percentage: number
}> {
  try {
    const client = await getMinIOClient()
    const buckets = await client.listBuckets()

    let totalSize = 0

    for (const bucket of buckets) {
      const stream = client.listObjectsV2(bucket.name, '', true)
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (obj: Minio.BucketItem) => {
          totalSize += obj.size ?? 0
        })
        stream.on('error', reject)
        stream.on('end', resolve)
      })
    }

    return {
      total: 0, // Disk total not available without admin API
      used: totalSize,
      available: 0,
      percentage: 0,
    }
  } catch {
    return { total: 0, used: 0, available: 0, percentage: 0 }
  }
}

async function getMinIOStats(): Promise<{
  files: number
  folders: number
  totalSize: number
}> {
  try {
    const client = await getMinIOClient()
    const buckets = await client.listBuckets()

    let files = 0
    let totalSize = 0

    for (const bucket of buckets) {
      const stream = client.listObjectsV2(bucket.name, '', true)
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (obj: Minio.BucketItem) => {
          if (obj.name) {
            files++
            totalSize += obj.size ?? 0
          }
        })
        stream.on('error', reject)
        stream.on('end', resolve)
      })
    }

    return { files, folders: 0, totalSize }
  } catch {
    return { files: 0, folders: 0, totalSize: 0 }
  }
}

async function getBucketStats(bucketName: string): Promise<{
  files: number
  folders: number
  size: number
  largestFile: { name: string; size: number }
  fileTypes: Record<string, number>
}> {
  try {
    const client = await getMinIOClient()

    let files = 0
    let totalSize = 0
    let largestFile = { name: '', size: 0 }
    const fileTypes: Record<string, number> = {}

    const stream = client.listObjectsV2(bucketName, '', true)
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (obj: Minio.BucketItem) => {
        if (!obj.name) return
        files++
        const size = obj.size ?? 0
        totalSize += size

        if (size > largestFile.size) {
          largestFile = { name: obj.name, size }
        }

        const dotPos = obj.name.lastIndexOf('.')
        const ext =
          dotPos !== -1 ? obj.name.substring(dotPos + 1).toLowerCase() : 'other'
        fileTypes[ext] = (fileTypes[ext] ?? 0) + 1
      })
      stream.on('error', reject)
      stream.on('end', resolve)
    })

    return {
      files,
      folders: 0,
      size: totalSize,
      largestFile,
      fileTypes,
    }
  } catch {
    return {
      files: 0,
      folders: 0,
      size: 0,
      largestFile: { name: '', size: 0 },
      fileTypes: {},
    }
  }
}

async function getProjectFileStorage() {
  try {
    const backendPath = getProjectPath()
    const { stdout } = await execAsync(
      `du -sh "${backendPath}" 2>/dev/null || echo "0B"`,
    )
    const size = stdout.split('\t')[0]?.trim() || '0B'

    return { path: backendPath, size, type: 'project-files' }
  } catch {
    return { path: getProjectPath(), size: 'Unknown', type: 'project-files' }
  }
}

async function getProjectDirectoryUsage() {
  try {
    const backendPath = getProjectPath()
    const { stdout } = await execAsync(
      `du -sh "${backendPath}"/* 2>/dev/null | sort -hr | head -10`,
    )

    const directories = stdout
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.split('\t')
        return { size: parts[0], path: parts[1] }
      })

    return { directories, total: directories.length }
  } catch {
    return { directories: [], total: 0 }
  }
}

function parseVolumeUsage(_output: string) {
  return { total: 0, volumes: [] as string[] }
}
