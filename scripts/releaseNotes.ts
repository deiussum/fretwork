/** What the release notes for one version are made from. */
export type ReleaseNotesInput = {
  /** The version without its `v`, e.g. "0.4.0". */
  version: string
  /** The image repository, e.g. "ghcr.io/deiussum/fretwork". */
  image: string
  /** Commit subjects since the previous version tag; undefined for the first release. */
  subjects: string[] | undefined
  /** The privacy statement's last-updated date at this version. */
  privacyUpdated: string
  /** The privacy statement's last-updated date at the previous version. */
  previousPrivacyUpdated?: string
}

type Entry = { type: string; text: string }

const GROUPS: { title: string; matches: (type: string) => boolean }[] = [
  { title: 'Features', matches: (type) => type === 'feat' },
  { title: 'Fixes', matches: (type) => type === 'fix' },
  { title: 'Other changes', matches: (type) => type !== 'feat' && type !== 'fix' },
]

const CONVENTIONAL = /^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/

/** A commit subject as a notes entry, or undefined for a version bump. */
export function parseSubject(subject: string): Entry | undefined {
  const match = CONVENTIONAL.exec(subject.trim())
  if (!match) return { type: '', text: subject.trim() }
  const [, type, scope, breaking, text] = match
  if (type === 'chore' && scope === 'release') return undefined
  const prefix = scope ? `**${scope}:** ` : ''
  // "(breaking)" goes before a trailing pull request number.
  const marked = breaking ? text.replace(/( \(#\d+\))?$/, ' (breaking)$1') : text
  return { type, text: `${prefix}${marked}` }
}

/** The Markdown body of a release page. */
export function releaseNotes(input: ReleaseNotesInput): string {
  const sections: string[] = []

  if (input.previousPrivacyUpdated !== undefined && input.previousPrivacyUpdated !== input.privacyUpdated) {
    sections.push(
      `## Privacy\n\nThe privacy statement changed in this release (last updated ${input.privacyUpdated}). ` +
        'If you host Fretwork, review it before updating.',
    )
  }

  if (input.subjects === undefined) {
    sections.push('First release of Fretwork.')
  } else {
    const entries = input.subjects.map(parseSubject).filter((e): e is Entry => e !== undefined)
    for (const group of GROUPS) {
      const items = entries.filter((e) => group.matches(e.type))
      if (items.length > 0) sections.push(`## ${group.title}\n\n${items.map((e) => `- ${e.text}`).join('\n')}`)
    }
    if (entries.length === 0) sections.push('No changes other than the version number.')
  }

  sections.push(`## Image\n\n\`\`\`sh\ndocker pull ${input.image}:${input.version}\n\`\`\``)
  return sections.join('\n\n') + '\n'
}
