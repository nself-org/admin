import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from 'util'

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Headers class
global.Headers = class MockHeaders extends Map {
  constructor(init) {
    super()
    if (init) {
      if (init instanceof Headers || init instanceof Map) {
        for (const [key, value] of init) {
          this.set(key, value)
        }
      } else if (typeof init === 'object') {
        for (const [key, value] of Object.entries(init)) {
          this.set(key, value)
        }
      }
    }
  }
  get(name) {
    return super.get(name.toLowerCase()) || null
  }
  set(name, value) {
    return super.set(name.toLowerCase(), String(value))
  }
  has(name) {
    return super.has(name.toLowerCase())
  }
  delete(name) {
    return super.delete(name.toLowerCase())
  }
  append(name, value) {
    const existing = this.get(name)
    if (existing) {
      this.set(name, `${existing}, ${value}`)
    } else {
      this.set(name, value)
    }
  }
}

// Mock Request for Next.js API routes (Web API compatible)
global.Request = class MockRequest {
  constructor(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url

    // Use defineProperties to make url and other properties read-only (like real Request)
    Object.defineProperties(this, {
      url: { value: url, enumerable: true },
      method: { value: init?.method || 'GET', enumerable: true },
      headers: { value: new Headers(init?.headers || {}), enumerable: true },
      body: { value: init?.body || null, writable: true },
      bodyUsed: { value: false, writable: true },
      cache: { value: init?.cache || 'default', enumerable: true },
      credentials: {
        value: init?.credentials || 'same-origin',
        enumerable: true,
      },
      destination: { value: '', enumerable: true },
      integrity: { value: init?.integrity || '', enumerable: true },
      mode: { value: init?.mode || 'cors', enumerable: true },
      redirect: { value: init?.redirect || 'follow', enumerable: true },
      referrer: { value: init?.referrer || 'about:client', enumerable: true },
      referrerPolicy: { value: init?.referrerPolicy || '', enumerable: true },
    })
  }

  clone() {
    return new MockRequest(this.url, {
      method: this.method,
      headers: this.headers,
      body: this.body,
    })
  }

  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body)
    }
    return this.body || {}
  }

  async text() {
    return String(this.body || '')
  }

  async arrayBuffer() {
    return new ArrayBuffer(0)
  }

  async blob() {
    return new Blob([this.body || ''])
  }

  async formData() {
    return new FormData()
  }
}

// Mock Response for Next.js API routes (Web API compatible with static json method)
global.Response = class MockResponse {
  constructor(body, init = {}) {
    Object.defineProperties(this, {
      body: { value: body, enumerable: true },
      status: { value: init?.status || 200, enumerable: true },
      statusText: { value: init?.statusText || 'OK', enumerable: true },
      headers: { value: new Headers(init?.headers || {}), enumerable: true },
      ok: {
        value: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
        enumerable: true,
      },
      redirected: { value: false, enumerable: true },
      type: { value: 'basic', enumerable: true },
      url: { value: '', enumerable: true },
      bodyUsed: { value: false, writable: true },
    })
  }

  static json(data, init = {}) {
    return new MockResponse(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    })
  }

  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
  }

  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
  }

  async arrayBuffer() {
    return new ArrayBuffer(0)
  }

  async blob() {
    return new Blob([this.body || ''])
  }

  clone() {
    return new MockResponse(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
    })
  }
}

// Mock WebSocket
global.WebSocket = class MockWebSocket {
  constructor() {
    this.readyState = 0
  }
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

// Mock EventSource for SSE
global.EventSource = class MockEventSource {
  constructor() {
    this.readyState = 0
  }
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Headers(),
    status: 200,
    statusText: 'OK',
  }),
)

// Mock Docker API
jest.mock('dockerode', () => {
  return jest.fn().mockImplementation(() => ({
    listContainers: jest.fn(() => Promise.resolve([])),
    getContainer: jest.fn(() => ({
      inspect: jest.fn(() => Promise.resolve({})),
      stats: jest.fn(() => Promise.resolve({})),
      logs: jest.fn(() => Promise.resolve('')),
      start: jest.fn(() => Promise.resolve()),
      stop: jest.fn(() => Promise.resolve()),
      restart: jest.fn(() => Promise.resolve()),
    })),
    listImages: jest.fn(() => Promise.resolve([])),
    listNetworks: jest.fn(() => Promise.resolve([])),
    listVolumes: jest.fn(() => Promise.resolve({ Volumes: [] })),
  }))
})

// Mock LokiJS
jest.mock('lokijs', () => {
  const collections = new Map()

  const createMockCollection = (name) => {
    const collection = {
      name,
      data: [],
      find: jest.fn(function (query = {}) {
        if (!query || Object.keys(query).length === 0) {
          return this.data
        }
        return this.data.filter((doc) => {
          return Object.keys(query).every((key) => {
            if (
              typeof query[key] === 'object' &&
              query[key].$ne !== undefined
            ) {
              return doc[key] !== query[key].$ne
            }
            return doc[key] === query[key]
          })
        })
      }),
      findOne: jest.fn(function (query = {}) {
        return (
          this.data.find((doc) =>
            Object.keys(query).every((key) => doc[key] === query[key]),
          ) || null
        )
      }),
      insert: jest.fn(function (doc) {
        const newDoc = { ...doc, $loki: this.data.length + 1 }
        this.data.push(newDoc)
        return newDoc
      }),
      update: jest.fn(function (doc) {
        const index = this.data.findIndex((d) => d.$loki === doc.$loki)
        if (index > -1) {
          this.data[index] = doc
        }
        return doc
      }),
      remove: jest.fn(function (doc) {
        const index = this.data.findIndex(
          (d) => d.$loki === doc.$loki || d === doc,
        )
        if (index > -1) {
          this.data.splice(index, 1)
        }
      }),
      removeWhere: jest.fn(function (query) {
        this.data = this.data.filter(
          (doc) => !Object.keys(query).every((key) => doc[key] === query[key]),
        )
      }),
      clear: jest.fn(function () {
        this.data = []
      }),
      count: jest.fn(function () {
        return this.data.length
      }),
      // LokiJS unique-index O(1) lookup by field value
      by: jest.fn(function (field, value) {
        if (value === undefined) {
          const col = this
          return function (v) {
            return col.by(field, v)
          }
        }
        return this.data.find((doc) => doc[field] === value) || undefined
      }),
      // Add chain() method for LokiJS query chaining
      chain: jest.fn(function () {
        const resultset = {
          _data: [...this.data],
          find: jest.fn(function (query = {}) {
            if (!query || Object.keys(query).length === 0) {
              return this
            }
            this._data = this._data.filter((doc) =>
              Object.keys(query).every((key) => {
                if (
                  typeof query[key] === 'object' &&
                  query[key].$ne !== undefined
                ) {
                  return doc[key] !== query[key].$ne
                }
                return doc[key] === query[key]
              }),
            )
            return this
          }),
          where: jest.fn(function (filterFunc) {
            this._data = this._data.filter(filterFunc)
            return this
          }),
          simplesort: jest.fn(function (field, descending = false) {
            this._data.sort((a, b) => {
              const aVal = a[field]
              const bVal = b[field]
              if (aVal < bVal) return descending ? 1 : -1
              if (aVal > bVal) return descending ? -1 : 1
              return 0
            })
            return this
          }),
          offset: jest.fn(function (offsetVal) {
            this._data = this._data.slice(offsetVal)
            return this
          }),
          limit: jest.fn(function (limitVal) {
            this._data = this._data.slice(0, limitVal)
            return this
          }),
          data: jest.fn(function () {
            return this._data
          }),
        }
        return resultset
      }),
    }
    return collection
  }

  return jest.fn().mockImplementation((filename, options = {}) => {
    const collections = new Map()

    const dbInstance = {
      getCollection: jest.fn((name) => {
        if (!collections.has(name)) {
          collections.set(name, createMockCollection(name))
        }
        return collections.get(name)
      }),
      addCollection: jest.fn((name, collectionOptions) => {
        const collection = createMockCollection(name)
        collections.set(name, collection)
        return collection
      }),
      loadDatabase: jest.fn((...args) => {
        // LokiJS supports loadDatabase(callback) and loadDatabase(options, callback)
        const callback = typeof args[0] === 'function' ? args[0] : args[1]
        if (typeof callback === 'function') {
          setTimeout(() => callback(), 0)
        }
      }),
      saveDatabase: jest.fn((callback) => {
        if (callback) {
          setTimeout(() => callback(), 0)
        }
      }),
      close: jest.fn(() => {}),
    }

    // If autoload is true, call autoloadCallback after a short delay
    if (options.autoload && options.autoloadCallback) {
      setTimeout(() => options.autoloadCallback(), 0)
    }

    return dbInstance
  })
})

// Mock child_process exec
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, options, callback) => {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    if (callback) {
      callback(null, '', '')
    }
    return { stdout: '', stderr: '' }
  }),
  spawn: jest.fn(() => ({
    stdout: { on: jest.fn(), pipe: jest.fn() },
    stderr: { on: jest.fn(), pipe: jest.fn() },
    on: jest.fn(),
    kill: jest.fn(),
  })),
}))

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(() => Promise.resolve('')),
  writeFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
  readdir: jest.fn(() => Promise.resolve([])),
  stat: jest.fn(() => Promise.resolve({ isDirectory: () => false })),
  access: jest.fn(() => Promise.resolve()),
}))

// Mock fs
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => ''),
  writeFileSync: jest.fn(() => {}),
  createReadStream: jest.fn(() => ({
    on: jest.fn(),
    pipe: jest.fn(),
  })),
  createWriteStream: jest.fn(() => ({
    on: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  })),
}))

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => ({ value: 'mock-token' })),
    set: jest.fn(),
    delete: jest.fn(),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
}))

// Mock next/server (NextRequest, NextResponse)
jest.mock('next/server', () => {
  const { Request, Response, Headers } = global

  class MockNextRequest extends Request {
    constructor(input, init = {}) {
      // Call parent constructor with URL and init
      super(input, init)

      // Add NextRequest-specific properties
      const url = new URL(typeof input === 'string' ? input : input.url)

      Object.defineProperties(this, {
        nextUrl: {
          value: {
            pathname: url.pathname,
            search: url.search,
            searchParams: new URLSearchParams(url.search),
            href: url.href,
            origin: url.origin,
            protocol: url.protocol,
            host: url.host,
            hostname: url.hostname,
            port: url.port,
            hash: url.hash,
          },
          enumerable: true,
        },
        cookies: {
          value: {
            get: jest.fn((name) => {
              const cookieHeader = this.headers.get('cookie') || ''
              const cookies = Object.fromEntries(
                cookieHeader
                  .split(';')
                  .map((c) => {
                    const [key, ...values] = c.trim().split('=')
                    return [key, values.join('=')]
                  })
                  .filter(([key]) => key),
              )
              return cookies[name] ? { name, value: cookies[name] } : undefined
            }),
            getAll: jest.fn(() => []),
            set: jest.fn(),
            delete: jest.fn(),
            has: jest.fn(),
            clear: jest.fn(),
          },
          enumerable: true,
        },
        geo: { value: {}, enumerable: true },
        ip: { value: '127.0.0.1', enumerable: true },
      })
    }
  }

  class MockNextResponse extends Response {
    constructor(body, init = {}) {
      super(body, init)

      // Add NextResponse-specific cookies API
      const cookieJar = []
      Object.defineProperty(this, 'cookies', {
        value: {
          set: jest.fn((name, value, options = {}) => {
            const cookieString = `${name}=${value}`
            cookieJar.push({ name, value, options })
            const existingCookies = this.headers.get('set-cookie') || ''
            const newCookies = existingCookies
              ? `${existingCookies}, ${cookieString}`
              : cookieString
            this.headers.set('set-cookie', newCookies)
          }),
          get: jest.fn((name) => {
            const cookie = cookieJar.find((c) => c.name === name)
            return cookie
              ? { name: cookie.name, value: cookie.value }
              : undefined
          }),
          getAll: jest.fn(() => cookieJar),
          delete: jest.fn((name) => {
            const index = cookieJar.findIndex((c) => c.name === name)
            if (index > -1) cookieJar.splice(index, 1)
          }),
          has: jest.fn((name) => cookieJar.some((c) => c.name === name)),
          clear: jest.fn(() => {
            cookieJar.length = 0
          }),
        },
        enumerable: true,
      })
    }

    static json(data, init = {}) {
      const response = new MockNextResponse(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      })
      return response
    }

    static redirect(url, init) {
      return new MockNextResponse(null, {
        ...init,
        status: init?.status || 307,
        headers: {
          Location: url,
          ...(init?.headers || {}),
        },
      })
    }

    static rewrite(url, init) {
      return new MockNextResponse(null, {
        ...init,
        headers: {
          'x-middleware-rewrite': url,
          ...(init?.headers || {}),
        },
      })
    }

    static next(init) {
      return new MockNextResponse(null, {
        ...init,
        headers: {
          'x-middleware-next': '1',
          ...(init?.headers || {}),
        },
      })
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  }
})

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  redirect: jest.fn(),
  notFound: jest.fn(),
}))

// Mock next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: jest.fn((fn) => fn),
}))

// Suppress console errors in tests unless needed
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalError
})
