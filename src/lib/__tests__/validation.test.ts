import {
  dockerActionSchema,
  envUpdateSchema,
  escapeShellArg,
  isValidContainerName,
  isValidEnvVarName,
  isValidFilePath,
  loginSchema,
  sanitizeCommand,
  sanitizeHtml,
  sanitizePath,
  validateRequest,
} from '../validation'

describe('sanitizeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    )
  })

  it('escapes ampersands', () => {
    expect(sanitizeHtml('foo & bar')).toBe('foo &amp; bar')
  })

  it('escapes single quotes', () => {
    expect(sanitizeHtml("it's")).toBe('it&#x27;s')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('')
  })

  it('handles multiple special characters', () => {
    expect(sanitizeHtml('<div class="test">\'quoted\'</div>')).toBe(
      '&lt;div class=&quot;test&quot;&gt;&#x27;quoted&#x27;&lt;&#x2F;div&gt;'
    )
  })
})

describe('sanitizePath', () => {
  it('removes null bytes', () => {
    expect(sanitizePath('/project/test\0file')).toBe('/project/testfile')
  })

  it('removes directory traversal attempts', () => {
    expect(sanitizePath('/project/../../../etc/passwd')).toBe('/project/etc/passwd')
  })

  it('normalizes double slashes', () => {
    expect(sanitizePath('/project//test///file')).toBe('/project/test/file')
  })

  it('allows paths with allowed prefixes', () => {
    expect(sanitizePath('/project/myfile.txt')).toBe('/project/myfile.txt')
    expect(sanitizePath('/backups/backup.tar')).toBe('/backups/backup.tar')
    expect(sanitizePath('/data/db.sqlite')).toBe('/data/db.sqlite')
    expect(sanitizePath('/tmp/temp.txt')).toBe('/tmp/temp.txt')
  })

  it('forces relative paths to project directory', () => {
    expect(sanitizePath('test.txt')).toBe('/project/test.txt')
  })

  it('allows relative paths starting with ./', () => {
    expect(sanitizePath('./test.txt')).toBe('./test.txt')
  })

  it('trims whitespace', () => {
    expect(sanitizePath('  /project/test.txt  ')).toBe('/project/test.txt')
  })
})

describe('sanitizeCommand', () => {
  it('removes shell metacharacters', () => {
    expect(sanitizeCommand('ls; rm -rf /')).toBe('ls rm -rf /')
    expect(sanitizeCommand('echo `whoami`')).toBe('echo whoami')
    expect(sanitizeCommand('cat $(id)')).toBe('cat id')
  })

  it('removes pipe and redirect characters', () => {
    expect(sanitizeCommand('ls | grep test')).toBe('ls  grep test')
    expect(sanitizeCommand('echo test > file')).toBe('echo test  file')
  })

  it('removes newlines', () => {
    expect(sanitizeCommand('echo test\nrm -rf /')).toBe('echo testrm -rf /')
  })

  it('preserves safe characters', () => {
    expect(sanitizeCommand('nself build --env=production')).toBe('nself build --env=production')
  })
})

describe('escapeShellArg', () => {
  it('returns empty quotes for empty string', () => {
    expect(escapeShellArg('')).toBe("''")
  })

  it('returns simple strings as-is', () => {
    expect(escapeShellArg('hello')).toBe('hello')
    expect(escapeShellArg('test_file.txt')).toBe('test_file.txt')
    expect(escapeShellArg('/path/to/file')).toBe('/path/to/file')
  })

  it('wraps strings with spaces in single quotes', () => {
    expect(escapeShellArg('hello world')).toBe("'hello world'")
  })

  it('escapes single quotes in strings', () => {
    // The function ends quote, adds escaped quote, continues: 'it' + \' + 's' wrapped = 'it'\'s'
    expect(escapeShellArg("it's")).toBe("'it'\\'s'")
  })

  it('handles special characters', () => {
    expect(escapeShellArg('$HOME')).toBe("'$HOME'")
    expect(escapeShellArg('test;rm')).toBe("'test;rm'")
  })
})

describe('isValidContainerName', () => {
  it('accepts valid container names', () => {
    expect(isValidContainerName('mycontainer')).toBe(true)
    expect(isValidContainerName('my_container')).toBe(true)
    expect(isValidContainerName('my-container')).toBe(true)
    expect(isValidContainerName('my.container')).toBe(true)
    expect(isValidContainerName('container123')).toBe(true)
  })

  it('rejects names starting with non-alphanumeric', () => {
    expect(isValidContainerName('_container')).toBe(false)
    expect(isValidContainerName('-container')).toBe(false)
    expect(isValidContainerName('.container')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidContainerName('')).toBe(false)
  })

  it('rejects names with special characters', () => {
    expect(isValidContainerName('my container')).toBe(false)
    expect(isValidContainerName('my@container')).toBe(false)
  })
})

describe('isValidEnvVarName', () => {
  it('accepts valid env var names', () => {
    expect(isValidEnvVarName('MY_VAR')).toBe(true)
    expect(isValidEnvVarName('DATABASE_URL')).toBe(true)
    expect(isValidEnvVarName('A')).toBe(true)
    expect(isValidEnvVarName('API_KEY_123')).toBe(true)
  })

  it('rejects names starting with numbers', () => {
    expect(isValidEnvVarName('123_VAR')).toBe(false)
  })

  it('rejects lowercase names', () => {
    expect(isValidEnvVarName('my_var')).toBe(false)
    expect(isValidEnvVarName('My_Var')).toBe(false)
  })

  it('rejects names with invalid characters', () => {
    expect(isValidEnvVarName('MY-VAR')).toBe(false)
    expect(isValidEnvVarName('MY VAR')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidEnvVarName('')).toBe(false)
  })
})

describe('isValidFilePath', () => {
  it('accepts valid file paths', () => {
    expect(isValidFilePath('/project/file.txt')).toBe(true)
    expect(isValidFilePath('./local/file.js')).toBe(true)
    expect(isValidFilePath('simple.txt')).toBe(true)
  })

  it('rejects paths with directory traversal', () => {
    expect(isValidFilePath('../secret.txt')).toBe(false)
    expect(isValidFilePath('/project/../etc/passwd')).toBe(false)
  })

  it('rejects paths with null bytes', () => {
    expect(isValidFilePath('/project/file\0.txt')).toBe(false)
  })

  it('rejects paths with shell metacharacters', () => {
    expect(isValidFilePath('/project/file;rm')).toBe(false)
    expect(isValidFilePath('/project/$(whoami)')).toBe(false)
    expect(isValidFilePath('/project/`id`')).toBe(false)
  })
})

describe('loginSchema', () => {
  it('accepts valid passwords', () => {
    const result = loginSchema.safeParse({ password: 'validpassword' })
    expect(result.success).toBe(true)
  })

  it('rejects empty passwords', () => {
    const result = loginSchema.safeParse({ password: '' })
    expect(result.success).toBe(false)
  })

  it('rejects passwords over 256 characters', () => {
    const result = loginSchema.safeParse({ password: 'a'.repeat(257) })
    expect(result.success).toBe(false)
  })
})

describe('dockerActionSchema', () => {
  it('accepts valid container IDs', () => {
    const result = dockerActionSchema.safeParse({
      action: 'start',
      containerId: 'abc123def456',
    })
    expect(result.success).toBe(true)
  })

  it('accepts full 64-char container IDs', () => {
    const result = dockerActionSchema.safeParse({
      action: 'stop',
      containerId: 'a'.repeat(64),
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid container IDs', () => {
    const result = dockerActionSchema.safeParse({
      action: 'start',
      containerId: 'invalid!id',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short container IDs', () => {
    const result = dockerActionSchema.safeParse({
      action: 'start',
      containerId: 'abc',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid actions', () => {
    const result = dockerActionSchema.safeParse({
      action: 'destroy',
      containerId: 'abc123def456',
    })
    expect(result.success).toBe(false)
  })
})

describe('envUpdateSchema', () => {
  it('accepts valid env updates', () => {
    const result = envUpdateSchema.safeParse({
      key: 'DATABASE_URL',
      value: 'postgres://localhost:5432/db',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid env var names', () => {
    const result = envUpdateSchema.safeParse({
      key: 'invalid-name',
      value: 'test',
    })
    expect(result.success).toBe(false)
  })
})

describe('validateRequest', () => {
  it('returns success for valid data', async () => {
    const result = await validateRequest({ password: 'test' }, loginSchema)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.password).toBe('test')
    }
  })

  it('returns errors for invalid data', async () => {
    const result = await validateRequest({ password: '' }, loginSchema)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toBeDefined()
    }
  })
})
