import fs from 'fs';
import path from 'path';
import { DetectorResult } from '../orchestrator';

const REQUIRED = [
  'src/services/compliance',
  'src/services/security',
  'src/services/audit',
];

export default async function (): Promise<DetectorResult> {
  const missing: string[] = [];
  for (const rel of REQUIRED) {
    const p = path.resolve(process.cwd(), rel);
    if (!fs.existsSync(p)) missing.push(`Missing compliance/security path: ${rel}`);
  }
  return {
    id: 'compliance-artifacts',
    description: 'Verify presence of compliance/security/audit services',
    passed: missing.length === 0,
    details: missing
  };
}
