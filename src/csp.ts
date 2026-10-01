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
