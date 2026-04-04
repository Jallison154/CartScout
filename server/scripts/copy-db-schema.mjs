import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcSchema = join(serverRoot, 'src', 'db', 'schema.sql');
const destDir = join(serverRoot, 'dist', 'db');
const destSchema = join(destDir, 'schema.sql');

mkdirSync(destDir, { recursive: true });
copyFileSync(srcSchema, destSchema);
