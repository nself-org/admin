/**
 * Unit tests for the workflow expression evaluator (vm.createContext sandbox).
 *
 * Covers S122-T01 acceptance criteria:
 *  - process.exit() → throws (process is not defined in sandbox)
 *  - require('fs')   → throws (require is not defined in sandbox)
 *  - global access   → throws (global is not defined in sandbox)
 *  - legitimate expressions work when given context vars
 */

import vm from 'vm'

// ── Helper — the exact sandbox logic used in executeTransformDataAction ──────
// We test the primitive directly rather than routing through the full LokiJS
// workflow engine, keeping the test fast and isolated.

function evalInSandbox(expr: string, context: Record<string, unknown>): unknown {
  const ctx = vm.createContext({ ...context })
  return vm.runInContext(expr, ctx, { timeout: 1000 })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('workflow vm sandbox isolation', () => {
  it('rejects access to process (process.exit)', () => {
    // WHY: process.exit() would kill the Node.js server from an untrusted expression.
    expect(() => evalInSandbox('process.exit(0)', {})).toThrow()
  })

  it('rejects access to require', () => {
    // WHY: require('fs').unlinkSync('/etc/passwd') would be a critical vulnerability.
    expect(() => evalInSandbox("require('fs')", {})).toThrow()
  })

  it('rejects access to global', () => {
    // WHY: globalThis / global access could expose host-process internals.
    expect(() => evalInSandbox('global.process', {})).toThrow()
  })

  it('globalThis in sandbox has no process property', () => {
    // WHY: In a vm.createContext sandbox, globalThis refers to the sandbox object
    // itself (not the host Node.js global). It does NOT throw — but it also does
    // not expose host process/require because those were never placed in the sandbox.
    // The security guarantee is absence, not an exception.
    const result = evalInSandbox('typeof globalThis.process', {})
    expect(result).toBe('undefined')
  })

  it('globalThis in sandbox does not expose require', () => {
    const result = evalInSandbox('typeof globalThis.require', {})
    expect(result).toBe('undefined')
  })

  it('allows simple arithmetic expressions', () => {
    const result = evalInSandbox('1 + 2', {})
    expect(result).toBe(3)
  })

  it('allows access to provided context variables', () => {
    const result = evalInSandbox('a + b', { a: 10, b: 5 })
    expect(result).toBe(15)
  })

  it('allows string operations on context vars', () => {
    const result = evalInSandbox('name.toUpperCase()', { name: 'alice' })
    expect(result).toBe('ALICE')
  })

  it('allows array map lambda expressions (transform-data usage)', () => {
    // This mirrors the executeTransformDataAction pattern:
    //   input.map(item => (expr)(item))
    const ctx = vm.createContext({ item: { price: 10, qty: 3 } })
    const result = vm.runInContext('(item) => item.price * item.qty', ctx, { timeout: 1000 })
    expect(typeof result).toBe('function')
    expect((result as (i: unknown) => unknown)({ price: 10, qty: 3 })).toBe(30)
  })

  it('times out on infinite loops', () => {
    // WHY: runaway expressions must not block the event loop indefinitely.
    expect(() => evalInSandbox('while(true){}', {})).toThrow()
  }, 3000)
})
