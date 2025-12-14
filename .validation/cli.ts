#!/usr/bin/env node
import path from 'path';
import { runDetectors, writeReport, DocClaimsDetector, ConstantsExportsDetector, PlaceholderPatternDetector, generateMasterList } from './orchestrator';

async function main() {
  const workspace = process.cwd();
  const out = path.join(workspace, 'docs', 'FORENSIC-AUDIT-REPORT.md');
  const master = path.join(workspace, 'docs', 'IMPLEMENTATION-MASTER-LIST.md');

  const results = await runDetectors(workspace, [DocClaimsDetector, ConstantsExportsDetector, PlaceholderPatternDetector]);
  await writeReport(out, results);
  await generateMasterList(workspace, master);

  const hasFail = results.some(r => r.status === 'fail');
  console.log(`Forensic audit complete. Report: ${out}`);
  if (hasFail) {
    console.error('Audit reported failures.');
    process.exit(2);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
