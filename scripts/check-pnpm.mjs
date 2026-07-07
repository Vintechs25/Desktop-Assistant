#!/usr/bin/env node
/**
 * Cross-platform pnpm enforcement script.
 * Replaces the Unix-only `sh -c '...'` preinstall hook so this works on
 * Windows (cmd.exe / PowerShell) as well as macOS and Linux.
 */
import { unlinkSync } from 'fs'

const agent = process.env.npm_config_user_agent ?? ''

if (!agent.startsWith('pnpm')) {
  console.error(
    '\nERROR: This workspace requires pnpm.\n' +
    '       Install it with:  corepack enable\n' +
    '       Then run:         pnpm install\n'
  )
  process.exit(1)
}

// Remove stale lock files left by npm or yarn to avoid confusion.
for (const lockFile of ['package-lock.json', 'yarn.lock']) {
  try {
    unlinkSync(lockFile)
  } catch {
    // File doesn't exist — that's fine.
  }
}
