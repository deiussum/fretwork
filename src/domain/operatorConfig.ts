/**
 * Details the operator of this instance states about their hosting, served as
 * `/config.json` from the app's own site. Fields are absent when not stated.
 */
export type OperatorConfig = {
  /** How long access logs are kept, e.g. "up to 7 days". */
  logRetention?: string
  /** How to contact the operator: a URL, a mailto: link, or plain text. */
  operatorContact?: string
}

export const OPERATOR_CONFIG_URL = '/config.json'

type FetchLike = (url: string, init: { cache: RequestCache }) => Promise<Pick<Response, 'ok' | 'json'>>

/** Fetch and validate the operator config. Anything missing or invalid counts as not stated. */
export async function loadOperatorConfig(fetchFn: FetchLike = (url, init) => fetch(url, init)): Promise<OperatorConfig> {
  try {
    const response = await fetchFn(OPERATOR_CONFIG_URL, { cache: 'no-cache' })
    if (!response.ok) return {}
    return parseOperatorConfig(await response.json())
  } catch {
    return {}
  }
}

/** Keep only the known fields that are non-empty strings. */
export function parseOperatorConfig(value: unknown): OperatorConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const v = value as Record<string, unknown>
  const text = (x: unknown) => (typeof x === 'string' && x.trim() !== '' ? x.trim() : undefined)
  const config: OperatorConfig = {}
  const logRetention = text(v.logRetention)
  const operatorContact = text(v.operatorContact)
  if (logRetention) config.logRetention = logRetention
  if (operatorContact) config.operatorContact = operatorContact
  return config
}
