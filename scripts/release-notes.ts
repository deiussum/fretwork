// Print the release notes for a version tag, from git history:
//
//   npm run release-notes -- v0.4.0
//
// The image owner comes from GITHUB_REPOSITORY_OWNER, or else the origin remote.
import { execFileSync } from 'node:child_process'
import { releaseNotes } from './releaseNotes'

const PRIVACY_FILE = 'src/ui/PrivacyView.tsx'

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

/** The nearest version tag before `tag`, or undefined for the first release. */
function previousTag(tag: string): string | undefined {
  try {
    return git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*', `${tag}^`)
  } catch {
    return undefined
  }
}

function privacyUpdated(ref: string): string {
  const source = git('show', `${ref}:${PRIVACY_FILE}`)
  const match = /PRIVACY_UPDATED = '([^']+)'/.exec(source)
  if (!match) throw new Error(`No PRIVACY_UPDATED in ${PRIVACY_FILE} at ${ref}`)
  return match[1]
}

function imageOwner(): string {
  const fromEnv = process.env.GITHUB_REPOSITORY_OWNER
  if (fromEnv) return fromEnv
  const match = /github\.com[:/]([^/]+)\//.exec(git('remote', 'get-url', 'origin'))
  if (!match) throw new Error('Set GITHUB_REPOSITORY_OWNER; the origin remote is not on GitHub')
  return match[1]
}

const tag = process.argv[2]
if (!tag || !/^v\d+\.\d+\.\d+$/.test(tag)) {
  console.error('Usage: npm run release-notes -- v<x.y.z>')
  process.exit(2)
}
try {
  git('rev-parse', '--verify', '--quiet', `refs/tags/${tag}`)
} catch {
  console.error(`No tag ${tag}`)
  process.exit(1)
}

const previous = previousTag(tag)
const subjects = previous
  ? git('log', '--no-merges', '--format=%s', `${previous}..${tag}`).split('\n').filter((s) => s !== '')
  : undefined

process.stdout.write(
  releaseNotes({
    version: tag.slice(1),
    image: `ghcr.io/${imageOwner().toLowerCase()}/fretwork`,
    subjects,
    privacyUpdated: privacyUpdated(tag),
    previousPrivacyUpdated: previous && privacyUpdated(previous),
  }),
)
