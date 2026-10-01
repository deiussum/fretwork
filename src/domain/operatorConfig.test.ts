import { expect, test } from 'vitest'
import { loadOperatorConfig, OPERATOR_CONFIG_URL, parseOperatorConfig } from './operatorConfig'

const respond = (body: unknown, ok = true) => async () => ({ ok, json: async () => body })

test('loads both fields from a valid file, without caching', async () => {
  const calls: unknown[] = []
  const config = await loadOperatorConfig(async (url, init) => {
    calls.push([url, init])
    return { ok: true, json: async () => ({ logRetention: 'up to 7 days', operatorContact: 'mailto:a@example.com' }) }
  })
  expect(config).toEqual({ logRetention: 'up to 7 days', operatorContact: 'mailto:a@example.com' })
  expect(calls).toEqual([[OPERATOR_CONFIG_URL, { cache: 'no-cache' }]])
})

test('a missing file means nothing stated', async () => {
  expect(await loadOperatorConfig(respond('<html>', false))).toEqual({})
})

test('invalid JSON or a network error means nothing stated', async () => {
  const badJson = async () => ({ ok: true, json: async () => JSON.parse('{oops') })
  expect(await loadOperatorConfig(badJson)).toEqual({})
  expect(await loadOperatorConfig(async () => Promise.reject(new TypeError('offline')))).toEqual({})
})

test('non-string and empty fields are not stated; extra fields are ignored', () => {
  expect(parseOperatorConfig({ logRetention: 7, operatorContact: '  ', other: 'x' })).toEqual({})
  expect(parseOperatorConfig({ logRetention: ' 30 days ', extra: true })).toEqual({ logRetention: '30 days' })
  expect(parseOperatorConfig(['up to 7 days'])).toEqual({})
  expect(parseOperatorConfig(null)).toEqual({})
})
