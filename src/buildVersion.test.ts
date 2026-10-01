import { expect, test } from 'vitest'
import { formatBuildVersion } from './buildVersion'

test('a release build shows the version and short commit', () => {
  expect(formatBuildVersion('build', '0.1.0', 'd933a13')).toBe('v0.1.0 · d933a13')
})

test('a build outside a git checkout shows only the version', () => {
  expect(formatBuildVersion('build', '0.1.0', undefined)).toBe('v0.1.0')
})

test('the dev server shows dev', () => {
  expect(formatBuildVersion('serve', '0.1.0', 'd933a13')).toBe('dev')
})
