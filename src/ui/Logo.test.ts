import { expect, test } from 'vitest'
import favicon from '../../public/favicon.svg?raw'
import { MARK } from './Logo'

/** Attributes of the nth element with this tag, as a string map. */
function attrs(tag: string, nth = 0): Record<string, string> {
  const matches = [...favicon.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))]
  const found = matches[nth]?.[1] ?? ''
  return Object.fromEntries([...found.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]))
}

const asStrings = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)]))

test('favicon.svg draws the same mark as the Logo component', () => {
  expect(attrs('svg').viewBox).toBe(MARK.viewBox)
  expect(attrs('rect')).toMatchObject(asStrings(MARK.tile))
  MARK.frets.forEach((fret, i) => expect(attrs('line', i)).toMatchObject(asStrings(fret)))
  expect(attrs('g')['stroke-width']).toBe(String(MARK.fretWidth))
  expect(attrs('circle')).toMatchObject(asStrings(MARK.dot))
})

test('favicon.svg switches to the dark colours with the colour scheme', () => {
  expect(favicon).toContain('@media (prefers-color-scheme: dark)')
  expect(favicon).toContain('#e0803f')
  expect(favicon).toContain('#16140f')
})
