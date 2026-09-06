/**
 * Copies non-TypeScript assets into dist/ after `tsc`.
 *
 * tsconfig sets rootDir=./src, and tsc only emits .ts output — the email
 * .html templates and manifest.json are never carried across on their own.
 * Without this step a production build renders empty email bodies.
 */
import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const assets = [{ from: 'src/templates', to: 'dist/templates' }];

for (const { from, to } of assets) {
  const src = join(root, from);
  const dest = join(root, to);

  if (!existsSync(src)) {
    console.error(`✗ missing source directory: ${from}`);
    process.exit(1);
  }

  await mkdir(dirname(dest), { recursive: true });
  await cp(src, dest, {
    recursive: true,
    // _build.mjs is a dev-time generator — it has no business in the bundle.
    filter: (path) => !path.endsWith('_build.mjs'),
  });
  console.log(`✓ ${from} → ${to}`);
}
