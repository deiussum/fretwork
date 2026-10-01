import { expect, test } from 'vitest'
import { buildCsp, nginxHeaderSnippet, securityHeaders } from './csp'

test('every resource type is limited to the app own site', () => {
  const csp = buildCsp()
  for (const directive of ['default-src', 'script-src', 'worker-src', 'connect-src', 'img-src', 'style-src', 'media-src', 'font-src', 'base-uri']) {
    expect(csp).toContain(`${directive} 'self'`)
  }
  expect(csp).toContain("object-src 'none'")
  expect(csp).toContain("form-action 'none'")
})

test('allows no inline code, eval or other sites', () => {
  const csp = buildCsp()
  expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|\*|https?:|data:|blob:/)
})

test('the CSP header is the build policy plus frame-ancestors', () => {
  const headers = new Map(securityHeaders())
  expect(headers.get('Content-Security-Policy')).toBe(`${buildCsp()}; frame-ancestors 'none'`)
  expect(headers.get('Permissions-Policy')).toBe('microphone=(self)')
  expect(headers.get('X-Content-Type-Options')).toBe('nosniff')
  expect(headers.get('Referrer-Policy')).toBe('no-referrer')
})

test('the nginx snippet adds every header, always', () => {
  const lines = nginxHeaderSnippet().trim().split('\n')
  expect(lines).toHaveLength(4)
  for (const [name, value] of securityHeaders()) {
    expect(lines).toContain(`add_header ${name} "${value}" always;`)
  }
})
