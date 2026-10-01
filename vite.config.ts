import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { formatBuildVersion } from './src/buildVersion.ts'
import { buildCsp } from './src/csp.ts'

/**
 * Short hash of the commit being built: `FRETWORK_COMMIT` when set (container
 * and Nix builds have no .git), otherwise git, otherwise undefined.
 */
function commitHash(): string | undefined {
  const fromEnv = process.env.FRETWORK_COMMIT?.trim()
  if (fromEnv) {
    // Shorten a full hash, keeping a "-dirty" marker (Nix builds of uncommitted trees).
    const match = /^([0-9a-f]{7,40})(-dirty)?$/.exec(fromEnv)
    return match ? match[1].slice(0, 7) + (match[2] ?? '') : fromEnv
  }
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || undefined
  } catch {
    return undefined
  }
}

/** Adds the Content-Security-Policy to the built page. The dev server needs inline scripts and a websocket, so it's build only. */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'fretwork-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: buildCsp() }, injectTo: 'head-prepend' },
    ],
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
  return {
    plugins: [react(), contentSecurityPolicy()],
    define: {
      __APP_VERSION__: JSON.stringify(formatBuildVersion(command, version, command === 'build' ? commitHash() : undefined)),
    },
    test: {
      // Engine/domain tests run in node; UI tests opt in with `// @vitest-environment jsdom`.
      environment: 'node',
    },
  }
})
