/**
 * The version shown in the footer: "dev" on the dev server, otherwise
 * "v<version>", followed by the short commit hash when the build knows it.
 */
export function formatBuildVersion(command: 'serve' | 'build', version: string, hash?: string): string {
  if (command === 'serve') return 'dev'
  return hash ? `v${version} · ${hash}` : `v${version}`
}
