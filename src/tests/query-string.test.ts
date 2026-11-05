/**
 * @jest-environment node
 */
// Runs the installed query-string package (reached through minio 8.0.7).
// query-string@7.1.3 require()s decode-uri-component, which is ESM from 0.5.x;
// patches/query-string@7.1.3.patch makes it read the default export. Without
// the patch parse() throws "decodeComponent is not a function".
const queryString = require('query-string')

describe('query-string with patched decode-uri-component', () => {
  it('decodes an encoded value', () => {
    expect(queryString.parse('a=b%20c')).toEqual({ a: 'b c' })
  })

  it('does not throw on a malformed value', () => {
    expect(() => queryString.parse('a=%E0%A4%A')).not.toThrow()
  })
})
