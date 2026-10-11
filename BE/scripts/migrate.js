import 'dotenv/config'
import { mkdtempSync, cpSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

// Prisma sorts directory names and records them in the database. Keep the
// deployed identity while allowing the repository's DDMMYYYY naming convention.
const source = fileURLToPath(new URL('../prisma/', import.meta.url))
const staging = mkdtempSync(join(tmpdir(), 'chillshrimp-migrations-'))
try {
  cpSync(source, staging, { recursive: true })
  renameSync(
    join(staging, 'migrations/10102026_028_add_inactive_farm_status'),
    join(staging, 'migrations/20261010_028_add_inactive_farm_status'),
  )
  const cli = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url))
  const result = spawnSync(process.execPath, [cli, 'migrate', process.argv[2] || 'deploy', '--schema', join(staging, 'schema.prisma')], { stdio: 'inherit' })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  rmSync(staging, { recursive: true, force: true })
}
