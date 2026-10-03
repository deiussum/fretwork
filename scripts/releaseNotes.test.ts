import { describe, expect, test } from 'vitest'
import { parseSubject, releaseNotes } from './releaseNotes'

const IMAGE = 'ghcr.io/deiussum/fretwork'

const V040_SUBJECTS = [
  'chore(release): 0.4.0 (#19)',
  'feat(strumming): add strumming pattern practice tool (#18)',
  'ci: develop branch flow; main holds the latest release (#16)',
  'test(deploy): wait for the access log line in the smoke test (#15)',
]

describe('subjects', () => {
  test('scope is kept in bold and the type is dropped', () => {
    expect(parseSubject('feat(strumming): add a tool (#18)')).toEqual({ type: 'feat', text: '**strumming:** add a tool (#18)' })
    expect(parseSubject('ci: develop branch flow (#16)')).toEqual({ type: 'ci', text: 'develop branch flow (#16)' })
  })

  test('version bumps are dropped', () => {
    expect(parseSubject('chore(release): 0.4.0 (#19)')).toBeUndefined()
  })

  test('a breaking change is marked', () => {
    expect(parseSubject('feat(engine)!: new clock (#30)')?.text).toBe('**engine:** new clock (breaking) (#30)')
  })

  test('a subject that is not a Conventional Commit is kept as it is', () => {
    expect(parseSubject('Tidy up the README')).toEqual({ type: '', text: 'Tidy up the README' })
  })
})

describe('notes', () => {
  test('0.4.0: features and other changes, no fixes, no version bump, privacy notice first', () => {
    const notes = releaseNotes({
      version: '0.4.0',
      image: IMAGE,
      subjects: V040_SUBJECTS,
      privacyUpdated: '2026-10-03',
      previousPrivacyUpdated: '2026-10-01',
    })
    expect(notes).toBe(
      [
        '## Privacy',
        '',
        'The privacy statement changed in this release (last updated 2026-10-03). If you host Fretwork, review it before updating.',
        '',
        '## Features',
        '',
        '- **strumming:** add strumming pattern practice tool (#18)',
        '',
        '## Other changes',
        '',
        '- develop branch flow; main holds the latest release (#16)',
        '- **deploy:** wait for the access log line in the smoke test (#15)',
        '',
        '## Image',
        '',
        '```sh',
        'docker pull ghcr.io/deiussum/fretwork:0.4.0',
        '```',
        '',
      ].join('\n'),
    )
  })

  test('no privacy notice when the date is unchanged; fixes are grouped', () => {
    const notes = releaseNotes({
      version: '0.3.1',
      image: IMAGE,
      subjects: ['chore(release): 0.3.1 (#14)', 'fix(deploy): serve the manifest as application/manifest+json (#13)'],
      privacyUpdated: '2026-10-01',
      previousPrivacyUpdated: '2026-10-01',
    })
    expect(notes).not.toContain('Privacy')
    expect(notes).toContain('## Fixes\n\n- **deploy:** serve the manifest as application/manifest+json (#13)')
    expect(notes).not.toContain('## Features')
    expect(notes).not.toContain('0.3.1 (#14)')
  })

  test('the image to pull is the exact version', () => {
    const notes = releaseNotes({ version: '0.4.0', image: IMAGE, subjects: [], privacyUpdated: 'x', previousPrivacyUpdated: 'x' })
    expect(notes).toContain('docker pull ghcr.io/deiussum/fretwork:0.4.0')
  })

  test('the first release says so and gives its image', () => {
    const notes = releaseNotes({ version: '0.2.0', image: IMAGE, subjects: undefined, privacyUpdated: '2026-10-01' })
    expect(notes).toBe('First release of Fretwork.\n\n## Image\n\n```sh\ndocker pull ghcr.io/deiussum/fretwork:0.2.0\n```\n')
  })

  test('a release with only a version bump says so', () => {
    const notes = releaseNotes({
      version: '0.4.1',
      image: IMAGE,
      subjects: ['chore(release): 0.4.1 (#21)'],
      privacyUpdated: 'x',
      previousPrivacyUpdated: 'x',
    })
    expect(notes).toContain('No changes other than the version number.')
  })
})
