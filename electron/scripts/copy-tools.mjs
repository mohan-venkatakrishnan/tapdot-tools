// Copies the site's tool folders into electron/tools/ so electron-builder can
// package them (its file globs resolve relative to electron/, not the repo
// root). Run before `npm start` / `npm run dist`. electron/tools/ is
// generated and gitignored — the site folders one level up are the only
// source of truth.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');
const dest = path.join(__dirname, '..', 'tools');

const FOLDERS = [
  'shared', 'assets',
  'study', 'write', 'dev', 'marketing', 'finance', 'legal', 'hr', 'health',
  'design', 'productivity', 'ai',
];
const FILES = ['index.html', 'privacy.html'];

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

for (const folder of FOLDERS) {
  const src = path.join(repoRoot, folder);
  if (fs.existsSync(src)) copyDir(src, path.join(dest, folder));
}
for (const file of FILES) {
  const src = path.join(repoRoot, file);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dest, file));
}

console.log(`Copied ${FOLDERS.length} folders + ${FILES.length} files into ${dest}`);
