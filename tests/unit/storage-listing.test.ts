/**
 * @jest-environment node
 */

/**
 * Storage route: object listing and bucket-notification stream through the real
 * minio client, pointed at a local stub S3 endpoint (no real bucket).
 *
 * The listing test exercises GET /api/storage?action=files (listObjectsV2 + XML
 * parsing). The notification test exercises the one minio code path that uses
 * stream-json (NotificationPoller parses a JSON-lines response), so it fails if
 * a stream-json major that minio 8.x cannot load is ever forced through an
 * override (stream-json 3.x dropped `Parser.make`).
 */

import * as http from 'http'
import type { AddressInfo } from 'net'
import { NextRequest } from 'next/server'

jest.mock('@/lib/env-handler', () => ({ readEnvFile: jest.fn() }))
jest.mock('@/lib/paths', () => ({ getProjectPath: jest.fn(() => '/tmp/none') }))
jest.mock('@/lib/require-auth', () => ({ requireAuth: jest.fn() }))
// decode-uri-component 0.5 (via minio > query-string 7) ships ESM only and
// jest.config.js cannot transpile it here; the listing paths never decode
// malformed input, so a plain decodeURIComponent stands in for it.
jest.mock('decode-uri-component', () => (s: string) => decodeURIComponent(s))

import { GET } from '@/app/api/storage/route'
import { readEnvFile } from '@/lib/env-handler'

const XMLNS = 'http://s3.amazonaws.com/doc/2006-03-01/'

const LIST_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="${XMLNS}">
  <Name>assets</Name>
  <Prefix></Prefix>
  <KeyCount>3</KeyCount>
  <MaxKeys>1000</MaxKeys>
  <Delimiter>/</Delimiter>
  <IsTruncated>false</IsTruncated>
  <Contents>
    <Key>readme.txt</Key>
    <LastModified>2026-01-02T03:04:05.000Z</LastModified>
    <ETag>"d41d8cd98f00b204e9800998ecf8427e"</ETag>
    <Size>12</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
  <Contents>
    <Key>logo.png</Key>
    <LastModified>2026-02-03T04:05:06.000Z</LastModified>
    <ETag>"0cc175b9c0f1b6a831c399e269772661"</ETag>
    <Size>2048</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
  <CommonPrefixes><Prefix>images/</Prefix></CommonPrefixes>
</ListBucketResult>`

const NOTIFICATION_LINE = JSON.stringify({
  Records: [{ eventName: 's3:ObjectCreated:Put', s3: { object: { key: 'a.txt', size: 1 } } }],
})

let server: http.Server
let port: number

function startStub(): Promise<void> {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    if (url.searchParams.has('location')) {
      res.writeHead(200, { 'Content-Type': 'application/xml' })
      res.end(`<?xml version="1.0"?><LocationConstraint xmlns="${XMLNS}"></LocationConstraint>`)
      return
    }
    if (url.searchParams.get('list-type') === '2') {
      res.writeHead(200, { 'Content-Type': 'application/xml' })
      res.end(LIST_XML)
      return
    }
    if (url.searchParams.has('events')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(`${NOTIFICATION_LINE}\n`)
      return
    }
    res.writeHead(404)
    res.end()
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      port = (server.address() as AddressInfo).port
      resolve()
    })
  })
}

beforeAll(async () => {
  await startStub()
  ;(readEnvFile as jest.Mock).mockResolvedValue({
    MINIO_HOST: '127.0.0.1',
    MINIO_PORT: String(port),
    MINIO_ROOT_USER: 'test-access',
    MINIO_ROOT_PASSWORD: 'test-secret-value',
  })
})

afterAll(async () => {
  server.closeAllConnections?.()
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('storage route object listing (minio client, stub S3 endpoint)', () => {
  it('lists files and folders with names and sizes', async () => {
    const req = new NextRequest('http://localhost/api/storage?action=files&bucket=assets&path=/')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    const files = body.data.files as { name: string; size: number; type: string }[]
    const byName = Object.fromEntries(files.map((f) => [f.name, f]))
    expect(byName['readme.txt']).toMatchObject({ size: 12, type: 'file' })
    expect(byName['logo.png']).toMatchObject({ size: 2048, type: 'file' })
    expect(byName['images/']).toMatchObject({ size: 0, type: 'folder' })
  })
})

describe('minio bucket-notification stream (stream-json JSON-lines parser)', () => {
  it('parses a JSON-lines notification response into notification events', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Minio = require('minio') as typeof import('minio')
    const client = new Minio.Client({
      endPoint: '127.0.0.1',
      port,
      useSSL: false,
      accessKey: 'test-access',
      secretKey: 'test-secret-value',
    })
    const poller = client.listenBucketNotification('assets', '', '', ['s3:ObjectCreated:*'])
    const record = await new Promise<{ eventName: string }>((resolve, reject) => {
      poller.on('notification', (r: unknown) => {
        poller.stop()
        resolve(r as { eventName: string })
      })
      poller.on('error', reject)
    })
    expect(record.eventName).toBe('s3:ObjectCreated:Put')
  })
})
