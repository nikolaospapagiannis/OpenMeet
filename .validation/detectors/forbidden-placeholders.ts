import fs from 'fs';
import { glob } from 'glob';
import { DetectorResult } from '../orchestrator';

const PATTERNS = [
  /\b0\.MAX_[A-Z_]+\b/g,
  /\b1\.MAX_[A-Z_]+\b/g,
  /calculateconfidence\s*\(/i,
  /this\.calculatereal\s*\(/i,
  /gutted function call/i,
  /PLACEHOLDER/i,
];

export default async function (): Promise<DetectorResult> {
  const files = await glob('src/**/*.ts', { nodir: true });
  const hits: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf-8');
    for (const pat of PATTERNS) {
      if (pat.test(text)) hits.push(`${file} matches ${pat}`);
      pat.lastIndex = 0;
    }
  }
  return {
    id: 'forbidden-placeholders',
    description: 'Detect placeholder patterns and gutted call artifacts in source',
    passed: hits.length === 0,
    details: hits.slice(0, 50) // limit output
  };
}
