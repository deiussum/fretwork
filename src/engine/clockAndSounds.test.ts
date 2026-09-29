import { expect, test } from 'vitest'
import { FakeClock } from './clock'
import { RecordingSounds } from './sounds'

test('fake clock advances deterministically', () => {
  const clock = new FakeClock(10)
  expect(clock.now()).toBe(10)
  clock.advance(1.5)
  clock.advance(0.25)
  expect(clock.now()).toBe(11.75)
})

test('recording scheduler records schedule times and cancellation', async () => {
  const sounds = new RecordingSounds()
  await sounds.resume()
  sounds.schedule('click', 1)
  sounds.schedule('go', 5)
  expect(sounds.scheduled).toEqual([
    { kind: 'click', at: 1 },
    { kind: 'go', at: 5 },
  ])
  sounds.cancelAll()
  expect(sounds.scheduled).toEqual([])
  expect(sounds.cancelCount).toBe(1)
  expect(sounds.resumeCount).toBe(1)
})
