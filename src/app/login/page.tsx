// Server component wrapper — must NOT have 'use client' so that
// `export const dynamic` is honoured by Next.js App Router.
//
// The login page is a client-heavy form.  Without forcing dynamic SSR, Next.js
// statically generates login.html at build time.  The pre-built HTML contains
// inline <script> tags with no nonce attribute; when the middleware sets a
// strict nonce-only CSP at response time those scripts are blocked and React
// hydration never runs → NO_FCP in Lighthouse / blank page in strict CSP mode.
//
// Setting dynamic = 'force-dynamic' ensures the page is server-rendered on
// every request, allowing Next.js app-render to extract the nonce from the
// incoming Content-Security-Policy request header (stamped by middleware) and
// inject it on every generated inline <script> tag before the HTML is sent.
export const dynamic = 'force-dynamic'

export { default } from './LoginClient'
