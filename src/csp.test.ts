import { expect, test } from 'vitest'
import { buildCsp } from './csp'

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
