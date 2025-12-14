import fs from 'fs';
import path from 'path';
import { DetectorResult } from '../orchestrator';

const DOCS = [
  'docs/IMPLEMENTATION-CHECKLIST.md',
];

export default async function (): Promise<DetectorResult> {
  const missing: string[] = [];
  const seen: string[] = [];

  // Check constants file
  const constantsPath = path.resolve(process.cwd(), 'src', 'config', 'business.constants.ts');
  if (!fs.existsSync(constantsPath)) missing.push('src/config/business.constants.ts not found');

  // Check scripts referenced by checklist
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const requiredScripts = ['typecheck', 'lint', 'test:unit', 'test:integration', 'health:check'];
  for (const s of requiredScripts) {
    if (!pkg.scripts?.[s]) missing.push(`npm script missing: ${s}`);
  }

  // Basic doc presence
  for (const d of DOCS) {
    const p = path.resolve(process.cwd(), d);
    if (!fs.existsSync(p)) missing.push(`doc missing: ${d}`); else seen.push(d);
  }

  return {
    id: 'docs-vs-impl',
    description: 'Validate that documented deliverables have corresponding code/scripts',
    passed: missing.length === 0,
    details: missing.length ? missing : [`Docs present: ${seen.join(', ')}`]
  };
}
