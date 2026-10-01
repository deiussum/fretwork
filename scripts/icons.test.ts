import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string): [number, number] {
  const png = readFileSync(new URL(`../public/${file}`, import.meta.url))
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG')
  expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR')
  return [png.readUInt32BE(16), png.readUInt32BE(20)]
}

test.each([
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
])('%s is %i px square', (file, size) => {
  expect(pngSize(file)).toEqual([size, size])
})

test('the manifest names the app and lists icons that exist at their stated sizes', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
  expect(manifest).toMatchObject({
    name: 'Fretwork',
    short_name: 'Fretwork',
    start_url: '/',
    display: 'standalone',
  })
  expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/)
  expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/)
  const purposes = new Set<string>()
  for (const icon of manifest.icons as { src: string; sizes: string; purpose: string }[]) {
    purposes.add(icon.purpose)
    const file = icon.src.replace(/^\//, '')
    if (icon.sizes === 'any') {
      expect(readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8')).toContain('<svg')
      continue
    }
    const [w, h] = icon.sizes.split('x').map(Number)
    expect(pngSize(file)).toEqual([w, h])
  }
  expect([...purposes].sort()).toEqual(['any', 'maskable'])
})

test('index.html links the icons, manifest and both theme colours', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  for (const href of ['/favicon.svg', '/favicon-32.png', '/apple-touch-icon.png', '/manifest.webmanifest']) {
    expect(html).toContain(`href="${href}"`)
  }
  expect(html).toContain('media="(prefers-color-scheme: light)"')
  expect(html).toContain('media="(prefers-color-scheme: dark)"')
})
