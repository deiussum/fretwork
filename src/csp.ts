/**
 * Content-Security-Policy for the production build: everything may come only
 * from the app's own site. Update it together with the privacy page.
 */
const DIRECTIVES: [string, string][] = [
  ['default-src', "'self'"],
  ['script-src', "'self'"],
  ['worker-src', "'self'"],
  ['connect-src', "'self'"],
  ['img-src', "'self'"],
  ['style-src', "'self'"],
  ['media-src', "'self'"],
  ['font-src', "'self'"],
  ['object-src', "'none'"],
  ['base-uri', "'self'"],
  ['form-action', "'none'"],
]

export function buildCsp(): string {
  return DIRECTIVES.map(([name, value]) => `${name} ${value}`).join('; ')
}

/**
 * HTTP headers every server should send with the app. The CSP is the build's
 * policy plus `frame-ancestors`, which only works as a header.
 */
export function securityHeaders(): [name: string, value: string][] {
  return [
    ['Content-Security-Policy', `${buildCsp()}; frame-ancestors 'none'`],
    ['Permissions-Policy', 'microphone=(self)'],
    ['X-Content-Type-Options', 'nosniff'],
    ['Referrer-Policy', 'no-referrer'],
  ]
}

/** The security headers as nginx `add_header` lines, for every location block to include. */
export function nginxHeaderSnippet(): string {
  return securityHeaders()
    .map(([name, value]) => `add_header ${name} "${value}" always;`)
    .join('\n')
    .concat('\n')
}
