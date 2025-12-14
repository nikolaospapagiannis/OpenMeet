import path from 'path';
import { promises as fsPromises } from 'fs';

const EMPTY: string[] = [];

export type DetectorResult = {
  id: string;
  description: string;
  status: 'pass' | 'fail' | 'warn';
  details?: string[];
};

export interface Detector {
  id: string;
  description: string;
  run(workspace: string): Promise<DetectorResult>;
}

async function walk(dir: string, acc: string[] = []): Promise<string[]> {
  const entries = await fsPromises.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

async function safeWalkIfExists(dir: string): Promise<string[]> {
  try {
    const stat = await fsPromises.stat(dir);
    if (!stat.isDirectory()) return EMPTY;
    return await walk(dir);
  } catch {
    return EMPTY;
  }
}

// Allowlist support
interface AllowlistDocClaims {
  ignorePrefixes?: string[];
  ignoreExact?: string[];
}
interface AllowlistFile {
  docClaims?: AllowlistDocClaims;
}
async function loadAllowlist(workspace: string): Promise<AllowlistFile> {
  const p = path.join(workspace, '.validation', 'allowlist.json');
  try {
    const raw = await fsPromises.readFile(p, 'utf8');
    return JSON.parse(raw) as AllowlistFile;
  } catch {
    return { docClaims: { ignorePrefixes: [], ignoreExact: [] } };
  }
}

export async function runDetectors(workspace: string, detectors: Detector[]): Promise<DetectorResult[]> {
  const results: DetectorResult[] = [];
  for (const d of detectors) {
    try {
      results.push(await d.run(workspace));
    } catch (err) {
      results.push({ id: d.id, description: d.description, status: 'fail', details: [String(err)] });
    }
  }
  return results;
}

export async function writeReport(filePath: string, results: DetectorResult[]): Promise<void> {
  const lines: string[] = [
    '# Forensic Audit Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    ''
  ];
  for (const r of results) {
    lines.push(`- [${r.status.toUpperCase()}] ${r.id} — ${r.description}`);
    if (r.details?.length) {
      for (const d of r.details) lines.push(`  - ${d}`);
    }
  }
  await fsPromises.writeFile(filePath, lines.join('\n'), 'utf8');
}

// Built-in detectors
export const DocClaimsDetector: Detector = {
  id: 'docs-claims-vs-implementation',
  description: 'Scan Markdown docs for phases/tasks and verify referenced files exist',
  async run(workspace) {
    const allow = await loadAllowlist(workspace);
    const prefixes = allow.docClaims?.ignorePrefixes || [];
    const exact = new Set((allow.docClaims?.ignoreExact || []).map(s => s.replace(/^[./]*/, '').replace(/\\/g, '/')));

    const docsDir = path.join(workspace, 'docs');
    const files = (await safeWalkIfExists(docsDir)).filter(f => f.endsWith('.md') || f.endsWith('.mdc'));
    const missing: string[] = [];
    const refsRegex = /`([^`]+\.(ts|md|mdc))`/g;
    for (const f of files) {
      const content = await fsPromises.readFile(f, 'utf8');
      let m: RegExpExecArray | null;
      while ((m = refsRegex.exec(content))) {
        const relRaw = m && m[1] ? m[1] : null;
        if (!relRaw) continue;
        const relNorm = relRaw.replace(/^[./]*/, '').replace(/\\/g, '/');
        const plausible = /^(docs|src|\.validation)\//.test(relNorm)
          && !/[\*{}$ ]/.test(relNorm)
          && /\.(ts|md|mdc)$/.test(relNorm);
        if (!plausible) continue;
        const isIgnored = exact.has(relNorm) || prefixes.some(pfx => relNorm.startsWith(pfx));
        if (isIgnored) continue;
        const abs = path.join(workspace, ...relNorm.split('/'));
        try { await fsPromises.access(abs); } catch { missing.push(`${path.relative(workspace, f)} → ${relNorm}`); }
      }
    }
    const soft = process.env.VALIDATION_SOFT === '1';
    return {
      id: 'docs-claims-vs-implementation',
      description: 'All referenced files in docs exist in repo',
      status: missing.length ? (soft ? 'warn' : 'fail') : 'pass',
      details: missing
    };
  }
};

export const ConstantsExportsDetector: Detector = {
  id: 'constants-exports-existence',
  description: 'Verify business constants file and required exports exist',
  async run(workspace) {
    const target = path.join(workspace, 'src', 'config', 'business.constants.ts');
    try {
      const content = await fsPromises.readFile(target, 'utf8');
      const required = [
        'MAX_RETRY_ATTEMPTS', 'MAX_PARALLEL_REQUESTS', 'DEFAULT_CONFIDENCE_THRESHOLD', 'BATCH_SIZE',
        'BUSINESS_CONSTANTS', 'BUSINESS_CALCULATION_CONSTANTS'
      ];
      const missing = required.filter(k => !new RegExp(`export\\s+(const|type|interface|enum)\\s+${k}\\b`).test(content));
      return { id: 'constants-exports-existence', description: 'Required business constants are exported', status: missing.length ? 'fail' : 'pass', details: missing };
    } catch {
      return { id: 'constants-exports-existence', description: 'business.constants.ts exists', status: 'fail', details: ['src/config/business.constants.ts not found'] };
    }
  }
};

export const PlaceholderPatternDetector: Detector = {
  id: 'placeholder-patterns',
  description: 'Detect forbidden placeholders like 0.MAX_* or gutted function calls',
  async run(workspace) {
    const roots = ['src', 'docs', '.validation'];
    const allNested = await Promise.all(roots.map(r => safeWalkIfExists(path.join(workspace, r))));
    const all = allNested.flat();
    const codeFiles = all.filter(f => /(\.ts|\.js|\.md|\.mdc)$/.test(f));
    const hits: string[] = [];
    const patterns = [
      /\b0\.MAX_\w+/g,
      /\b1\.MAX_\w+/g,
      /BATCH_SIZE\b(?!\s*[=:\(])/g,
      /\.\.\.(?!\.)/g
    ];
    for (const f of codeFiles) {
      const content = await fsPromises.readFile(f, 'utf8');
      for (const p of patterns) {
        if (p.test(content)) hits.push(path.relative(workspace, f));
      }
    }
    return { id: 'placeholder-patterns', description: 'No forbidden placeholder patterns remain', status: hits.length ? 'warn' : 'pass', details: hits };
  }
};

export async function generateMasterList(workspace: string, outFile: string): Promise<void> {
  const results = await runDetectors(workspace, [DocClaimsDetector, ConstantsExportsDetector, PlaceholderPatternDetector]);
  const lines: string[] = [
    '# IMPLEMENTATION MASTER LIST',
    '',
    `Generated: ${new Date().toISOString()}`,
    ''
  ];
    for (const r of results) {
    lines.push(`- ${r.id}: ${r.status}`);
    if (r.details?.length) for (const d of r.details) lines.push(`  - ${d}`);
  }
  await fsPromises.writeFile(outFile, lines.join('\n'), 'utf8');
}
