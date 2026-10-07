// Luora findings: imports Slither (`slither . --json slither.json`) and Aderyn (`aderyn . -o report.json`)
// reports into the atlas as finding pieces (sys 'vulns'), linked to the functions, calls and slots they
// touch. The same issue reported by several tools, or by the atlas' own checks (tool 'manual'), becomes
// one finding with every report attached. Recommendations are defensive: what is wrong and how to fix it.
//
//   node luora-export.mjs --slither=reports/slither.json --aderyn=reports/aderyn.json
//   (without flags, reports/slither.json, reports/aderyn.json, slither.json and report.json are picked up)
//
// No dependencies.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SEVERITIES = ['high', 'med', 'low', 'info'];
const TOOLS = ['slither', 'aderyn', 'manual'];
const SLITHER_SEV = { High: 'high', Medium: 'med', Low: 'low', Informational: 'info', Optimization: 'info' };
const SLITHER_CONF = { High: 'high', Medium: 'med', Low: 'low' };
const worse = (a, b) => (SEVERITIES.indexOf(a) <= SEVERITIES.indexOf(b) ? a : b);
const slug = s => s.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');

// Issue classes: detectors that report the same thing. Same class + same host function = one finding.
// `contract: true` classes (style / gas) are grouped once per contract instead of per function.
const CLASSES = {
  reentrancy: { title: 'State change after external call (reentrancy)',
    fix: 'Finish every storage write before the external call (checks-effects-interactions) and add a reentrancy guard (OpenZeppelin ReentrancyGuard, nonReentrant) to the entry point.',
    slither: ['reentrancy-eth', 'reentrancy-no-eth', 'reentrancy-benign', 'reentrancy-events', 'reentrancy-balance', 'reentrancy-unlimited-gas'], aderyn: ['reentrancy-state-change'] },
  unchecked: { title: 'Unchecked return value of external call',
    fix: 'Handle every return value: use SafeERC20 (safeTransfer, safeTransferFrom, forceApprove) for token calls and check or explicitly use the values returned by other calls.',
    slither: ['unchecked-transfer', 'unused-return', 'unchecked-lowlevel', 'unchecked-send'], aderyn: ['unchecked-return', 'unsafe-erc20-operation', 'unchecked-send', 'unchecked-low-level-call'] },
  zeroAddress: { title: 'Missing zero-address check',
    fix: 'Validate address parameters (require(addr != address(0))) before storing them.',
    slither: ['missing-zero-check'], aderyn: ['state-no-address-check'] },
  noEvent: { title: 'State change without event',
    fix: 'Emit an event for each state change that monitors and indexers need to follow, especially privileged configuration changes.',
    slither: ['events-access', 'events-maths'], aderyn: ['state-change-without-event'] },
  centralization: { title: 'Centralization risk: privileged functions',
    fix: 'Hold privileged roles in a multisig, put configuration changes behind a timelock and document what each role can change.',
    aderyn: ['centralization-risk'] },
  strictEquality: { title: 'Strict equality on a value that can change',
    fix: 'Prefer range checks (>=, <=) or internal accounting over an exact match on balances and supplies.',
    slither: ['incorrect-equality'], aderyn: ['strict-equality-contract-balance'] },
  divideBeforeMultiply: { title: 'Division before multiplication',
    fix: 'Multiply before dividing (or use a mulDiv helper) so precision is not lost to rounding.',
    slither: ['divide-before-multiply'], aderyn: ['division-before-multiplication'] },
  timestamp: { title: 'Logic depends on block.timestamp',
    fix: 'Do not rely on block.timestamp for exact comparisons; take caller-supplied deadlines and tolerate validator drift of a few seconds.',
    slither: ['timestamp'], aderyn: ['block-timestamp-deadline'] },
  txOrigin: { title: 'tx.origin used for authorization',
    fix: 'Authorize with msg.sender instead of tx.origin.',
    slither: ['tx-origin'], aderyn: ['tx-origin-used-for-auth'] },
  arbitraryFrom: { title: 'transferFrom with an arbitrary from address',
    fix: 'Only move tokens from msg.sender or from an address that explicitly authorized this call.',
    slither: ['arbitrary-send-erc20', 'arbitrary-send-erc20-permit'], aderyn: ['arbitrary-transfer-from'] },
  lockedEther: { title: 'Contract can receive but not withdraw ether',
    fix: 'Remove payable entry points that are not needed, or add a guarded withdrawal path.',
    slither: ['locked-ether'], aderyn: ['contract-locks-ether'] },
  shadowing: { title: 'Variable shadowing',
    fix: 'Rename the shadowing variable so every name refers to one declaration.',
    slither: ['shadowing-local', 'shadowing-state', 'shadowing-builtin'], aderyn: ['local-variable-shadowing', 'state-variable-shadowing', 'builtin-symbol-shadowing'] },
  pragma: { contract: true, title: 'Floating or outdated Solidity pragma',
    fix: 'Pin the compiler version (pragma solidity 0.8.x;) to a release without known bugs, the one the tests ran with.',
    slither: ['solc-version', 'pragma'], aderyn: ['unspecific-solidity-pragma'] },
  push0: { contract: true, title: 'PUSH0 opcode in bytecode',
    fix: 'Confirm every target chain supports PUSH0 (Shanghai), or compile with evm_version = "paris".',
    aderyn: ['push-zero-opcode'] },
  immutable: { contract: true, title: 'State variables could be immutable',
    fix: 'Declare variables that are only set in the constructor as immutable.',
    slither: ['immutable-states'], aderyn: ['state-variable-could-be-immutable'] },
  constant: { contract: true, title: 'State variables could be constant',
    fix: 'Declare variables that never change as constant.',
    slither: ['constable-states'], aderyn: ['state-variable-could-be-constant'] },
  literals: { contract: true, title: 'Numeric literals instead of named constants',
    fix: 'Replace repeated or long literals with named constants (e.g. PRECISION = 1e18, BPS = 10_000).',
    slither: ['too-many-digits'], aderyn: ['large-numeric-literal', 'literal-instead-of-constant'] },
  inheritance: { contract: true, title: 'Missing interface inheritance',
    fix: 'Inherit the interface the contract implements so the compiler checks the signatures.',
    slither: ['missing-inheritance'], aderyn: ['missing-inheritance'] },
  deadCode: { contract: true, title: 'Unused code',
    fix: 'Remove unused functions, variables and imports.',
    slither: ['dead-code', 'unused-state'], aderyn: ['dead-code', 'unused-state-variable', 'unused-import', 'unused-error'] },
  modifierOnce: { contract: true, title: 'Modifier used only once',
    fix: 'Inline the check or keep the modifier only if more functions will use it.',
    aderyn: ['modifier-used-only-once'] },
  naming: { contract: true, title: 'Naming convention',
    fix: 'Follow the Solidity style guide naming conventions.',
    slither: ['naming-convention'], aderyn: ['inconsistent-type-names'] },
};
const CLASS_OF = {};
for (const [cls, c] of Object.entries(CLASSES)) for (const tool of ['slither', 'aderyn']) for (const d of c[tool] ?? []) CLASS_OF[`${tool}:${d}`] = cls;
// the atlas' own checks (luora-atlas.mjs), matched by title
const MANUAL_CLASS = [[/after external call/i, 'reentrancy'], [/unchecked erc20/i, 'unchecked'], [/privileged/i, 'centralization']];

const human = s => s.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
/** Slither description without file refs / tabs: "Reentrancy in LuoraVault.withdraw(uint256):\n- ..." */
const tidy = s => s.replace(/ \([^()\n]*#\d+(-\d+)?\)/g, '').replace(/\n\t+/g, '\n').trim();

/**
 * Tool reports → flat instances: one per (tool result, location).
 * { tool, detector, risk, confidence?, file, lines: 1-based[], vars: string[], title, text, ref? }
 */
export function parseSlither(json) {
  const out = [];
  for (const r of json?.results?.detectors ?? []) {
    const [first] = r.elements ?? [];
    if (!first?.source_mapping) continue;
    const nodes = r.elements.filter(e => e.type === 'node');
    const lines = nodes.length ? nodes.flatMap(e => e.source_mapping.lines.slice(0, 1)) : first.source_mapping.lines.slice(0, 1);
    const vars = r.elements.flatMap(e => [e.additional_fields?.variable_name, e.type === 'variable' && e.name].filter(Boolean));
    out.push({ tool: 'slither', detector: r.check, risk: SLITHER_SEV[r.impact] ?? 'info', confidence: SLITHER_CONF[r.confidence],
      file: first.source_mapping.filename_relative, lines, vars, title: human(r.check), text: tidy(r.description ?? ''), ref: r.reference });
  }
  return out;
}

export function parseAderyn(json) {
  const out = [];
  for (const [key, risk] of [['critical_issues', 'high'], ['high_issues', 'high'], ['medium_issues', 'med'], ['low_issues', 'low'], ['nc_issues', 'info']])
    for (const issue of json?.[key]?.issues ?? [])
      for (const x of issue.instances ?? []) {
        // hint "State is changed at: `shares[msg.sender] += minted`" → shares
        const vars = [...(x.hint ?? '').matchAll(/`\s*([A-Za-z_]\w*)/g)].map(m => m[1]);
        out.push({ tool: 'aderyn', detector: issue.detector_name, risk, file: x.contract_path, lines: [x.line_no], vars, title: issue.title,
          text: [issue.description.replace(/\.(?=[A-Z])/g, '. '), x.hint && `${x.hint}.`].filter(Boolean).join(' ') });
      }
  return out;
}

/** Report files to import: --slither=… / --aderyn=… flags, else the conventional names in `root`. */
export function reportFiles(root, argv = []) {
  const flag = name => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const first = (...xs) => xs.map(x => join(root, x)).find(existsSync);
  return {
    slither: flag('slither') ? join(root, flag('slither')) : first('reports/slither.json', 'slither.json'),
    aderyn: flag('aderyn') ? join(root, flag('aderyn')) : first('reports/aderyn.json', 'report.json'),
  };
}

export function loadReports(files) {
  const read = f => JSON.parse(readFileSync(f, 'utf8'));
  return [...(files.slither ? parseSlither(read(files.slither)) : []), ...(files.aderyn ? parseAderyn(read(files.aderyn)) : [])];
}

/**
 * Merges tool instances into the atlas (mutates and returns it): one finding piece per issue class and
 * host function, existing atlas findings tagged tool 'manual' and absorbed when they match. Finding ids
 * are stable across exports (triage in the frontend is keyed by them).
 */
export function mergeFindings(atlas, instances) {
  const LINES = atlas.source.split('\n');
  const pieces = atlas.pieces.filter(p => p.sys !== 'vulns');
  const byId = new Map(atlas.pieces.map(p => [p.id, p]));
  const fns = pieces.filter(p => ['entry', 'logic', 'access'].includes(p.sys) && !p.ghost && p.n);
  const hostAt = l => fns.filter(p => l >= p.line && l < p.line + p.n).sort((a, b) => a.n - b.n)[0];
  const sameFile = f => f && (f === atlas.file || f.endsWith(`/${atlas.file}`) || atlas.file.endsWith(`/${f}`));

  // ---------- group instances ----------
  const groups = new Map();
  for (const x of instances) {
    if (!sameFile(x.file)) continue;
    const cls = CLASS_OF[`${x.tool}:${x.detector}`] ?? `${x.tool}:${x.detector}`, def = CLASSES[cls];
    const lines = x.lines.map(l => l - 1);
    const host = (def ? def.contract : x.risk === 'info') ? null : hostAt(lines[0]);
    const key = `${cls}@${host?.id ?? 'contract'}`;
    const g = groups.get(key) ?? { cls, host, title: def?.title ?? x.title, fix: def?.fix, lines: new Set(), vars: new Set(), texts: [], reports: new Map() };
    groups.set(key, g);
    for (const l of lines) g.lines.add(l);
    for (const v of x.vars) g.vars.add(v);
    if (x.text && !g.texts.includes(x.text)) g.texts.push(x.text);
    const rk = `${x.tool}:${x.detector}`, prev = g.reports.get(rk);
    g.reports.set(rk, { tool: x.tool, detector: x.detector, risk: prev ? worse(prev.risk, x.risk) : x.risk, ...(x.confidence && { confidence: x.confidence }), ...(x.ref && { ref: x.ref }) });
  }

  const sortReports = rs => rs.sort((a, b) => SEVERITIES.indexOf(a.risk) - SEVERITIES.indexOf(b.risk) || TOOLS.indexOf(a.tool) - TOOLS.indexOf(b.tool));
  const primary = p => { const [r] = sortReports(p.reports); Object.assign(p, { tool: r.tool, detector: r.detector, risk: p.reports.reduce((w, x) => worse(w, x.risk), r.risk) }); if (r.confidence) p.confidence = r.confidence; else delete p.confidence; };
  const by = g => [...g.reports.values()].map(r => `${r.tool} (${r.detector})`).join(', ');

  // ---------- manual findings: tag, and absorb tool reports of the same issue on the same host ----------
  const findings = [];
  for (const f of atlas.pieces.filter(p => p.sys === 'vulns')) {
    const title = f.name.replace(/^F-\d+ /, '');
    const cls = MANUAL_CLASS.find(([re]) => re.test(title))?.[1];
    const key = `${cls}@${atlas.lesion[f.id]}`, g = cls && groups.get(key);
    f.name = title;
    f.reports = [{ tool: 'manual', detector: `luora-${slug(cls ?? title).toLowerCase()}`, risk: f.risk ?? 'low' }];
    if (g) {
      groups.delete(key);
      f.reports.push(...g.reports.values());
      const [what, fix] = f.desc.split(/ Fix: /);
      f.desc = `${what} Also reported by ${by(g)}. Fix: ${fix ?? g.fix}`;
      const end = f.line + (f.n ?? 1);
      f.mark = [...new Set([...(f.mark ?? []), ...[...g.lines].filter(l => l >= f.line && l < end).map(l => l - f.line)])].sort((a, b) => a - b);
    }
    primary(f);
    findings.push(f);
  }

  // ---------- one piece per remaining group ----------
  for (const g of groups.values()) {
    const lines = [...g.lines].sort((a, b) => a - b);
    const [lo, hi] = g.host ? [g.host.line, g.host.line + g.host.n - 1] : [lines[0], lines.at(-1)];
    const touched = pieces.filter(p => ['storage', 'calls', 'events'].includes(p.sys) && (g.lines.has(p.line) || (p.sys === 'storage' && g.vars.has(p.id))));
    let id = `f_${slug(g.cls)}_${g.host?.id ?? 'contract'}`;
    while (byId.has(id)) id += '_';
    const fix = g.fix ?? (g.cls.startsWith('aderyn:') ? 'Follow the detector guidance above, or document why this instance is safe.' : `Review the ${g.cls.split(':')[1]} detector documentation, then fix the flagged code or document why it is safe.`);
    const f = { id, sys: 'vulns', name: g.title, find: LINES[lo].trim(), line: lo, n: hi - lo + 1,
      mark: lines.filter(l => l >= lo && l <= hi).map(l => l - lo),
      desc: `${g.texts.join('\n')}\nFix: ${fix}`,
      links: [...new Set([...(g.host ? [g.host.id] : []), ...touched.map(p => p.id)])], reports: [...g.reports.values()] };
    primary(f);
    byId.set(id, f);
    const lesion = g.host?.id ?? touched[0]?.id;
    if (lesion) atlas.lesion[id] = lesion;
    findings.push(f);
  }

  // ---------- worst first, numbered ----------
  findings.sort((a, b) => SEVERITIES.indexOf(a.risk) - SEVERITIES.indexOf(b.risk) || a.line - b.line);
  findings.forEach((f, i) => { f.name = `F-${String(i + 1).padStart(2, '0')} ${f.name}`; });
  atlas.pieces = [...pieces, ...findings];
  return atlas;
}
