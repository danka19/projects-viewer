#!/usr/bin/env node
/**
 * Read-only documentation scanner.
 *
 * Reads app-data/projects.config.json, scans ONLY documentation files inside
 * each enabled configured project, and writes app-data/projects.generated.json
 * for the live dashboard.
 * It never writes to, moves, or modifies any file in the scanned projects.
 *
 * Safety boundaries:
 * - visits only enabled project roots listed in the saved dashboard config;
 * - inside a root, enters only docs/, specs/, .openspec/, openapi/;
 * - never follows symlinks or junctions (no disk escape, no cycles);
 * - recursion depth and per-project file count are capped;
 * - reads only *.md files up to 1 MB; everything else is ignored;
 * - the only scanner write is generated dashboard data inside this dashboard folder.
 *
 * Extraction layers:
 * 1. Checkbox tasks and TODO/FIXME/BUG/NEXT:/DONE: markers.
 * 2. Documentation-convention intelligence: roadmap phases with prose Status:
 *    lines, dated decisions, blocked/rejected/human-gated work, risks and open
 *    questions, handoff lifecycle, OpenSpec changes, audit documents, and
 *    documentation gaps.
 * 3. Normalization: every doc file is classified into a category
 *    (core/roadmap/spec/audit/decision/handoff/other) using fuzzy filename
 *    patterns, and each project gets a compact summary object with a health
 *    score, current phase, next action, main blocker/risk, and doc coverage.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureProjectConfig } from './server/project-config.mjs';
import { buildSpecWork } from './server/spec-work.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_APP_DATA_DIR = path.join(__dirname, 'app-data');
const DEFAULT_CONFIG_PATH = path.join(DEFAULT_APP_DATA_DIR, 'projects.config.json');
const DEFAULT_OUTPUT_PATH = path.join(DEFAULT_APP_DATA_DIR, 'projects.generated.json');
const CONFIG_PATH = DEFAULT_CONFIG_PATH;
const OUTPUT_PATH = DEFAULT_OUTPUT_PATH;

// ---------------------------------------------------------------- scan rules

const ROOT_DOC_FILES = new Set([
  'readme.md',
  'claude.md',
  'agents.md',
  'context.md',
  'todo.md',
  'roadmap.md',
  'changelog.md',
]);
const DOC_DIRS = new Set(['docs', 'specs', '.openspec', 'openspec', 'openapi']);
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'vendor',
]);
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
const MAX_DEPTH = 12;
const DEFAULT_ACTIVE_DAYS = 14;
const STALE_DOC_DAYS = 30;

const LIMITS = {
  docs: 2000,
  tasks: 500,
  markers: 500,
  headings: 300,
  nextTasks: 200,
  steps: 300,
  phases: 100,
  decisions: 150,
  blockers: 150,
  blockedGatedCandidates: 500,
  risks: 80,
};

// -------------------------------------------------------- doc classification

/**
 * Classify a doc file by path/filename patterns. Order matters: the first
 * matching category wins, so the more specific delivery/QA vocabulary is
 * checked before the broad roadmap/spec words it often co-occurs with.
 */
function classifyDoc(file) {
  const f = file.toLowerCase();
  const base = f.split('/').pop() ?? f;
  if (/handoff/.test(f)) return 'handoff';
  // Folder placement wins first (docs/audits/, reviews/, qa/); then filename
  // keywords. "acceptance" is deliberately folder-only — phase plans use it in
  // titles (…_UI_STATE_ACCEPTANCE.md) and must stay roadmap docs.
  if (
    /(^|\/)(audits?|reviews?|qa|verification)\//.test(f) ||
    /audit|(^|[/_-])review|verification|checklist|validation|(^|[/_-])qa([/_.-]|$)|test-report/.test(
      base,
    )
  ) {
    return 'audit';
  }
  if (/decision|(^|\/)adr(\/|[_-])/.test(f)) return 'decision';
  if (
    /(^|\/)(\.openspec|specs|openapi)\//.test(f) ||
    /(^|\/)docs\/(specs|design|architecture)\//.test(f) ||
    /sdd|spec|proposal|(^|[/_-])change|requirement|design|architecture/.test(base)
  ) {
    return 'spec';
  }
  if (/roadmap|roamap|road-map|milestone|phase|plan/.test(f)) return 'roadmap';
  if (
    [
      'readme.md',
      'claude.md',
      'agents.md',
      'context.md',
      'todo.md',
      'changelog.md',
      'contributing.md',
    ].includes(base)
  ) {
    return 'core';
  }
  return 'other';
}

// ------------------------------------------------------------ line patterns

const TASK_RE = /^\s*[-*]\s+\[([ xX])\]\s+(.+)$/;
const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const HEADING_FILE_RE = /(roadmap|todo|task|spec|plan|phase)/i;
const HEADING_TEXT_RE = /(roadmap|task|spec|phase|plan|milestone|next|backlog|status|gate)/i;
const HARD_MARKER_RE = /\b(TODO|FIXME|BUG)\b/g;
const SOFT_MARKER_RE = /\b(NEXT|DONE)\s*:/g;
const NEXT_SECTION_RE = /next/i;
const STANDALONE_NEXT_MARKER_RE = /^\s*(?:[-*]\s+)?NEXT\s*:\s*(\S.*)$/i;

// Convention intelligence patterns
const PHASE_HEADING_SECTION_RE = /^#{2,3}\s+Phase\s+([0-9][0-9.]*)\.?\s+(.+)$/i;
const PHASE_HEADING_TITLE_RE = /^#\s+Phase\s+([0-9][0-9.]*)\s*[-–—:.]\s*(.+)$/i;
const STATUS_LINE_RE = /^Status:\s*(.+)$/i;
const BRANCH_RE = /`([a-z0-9-]+\/[a-z0-9-]+)`/;
const DATE_RE = /\b(20\d{2}-\d{2}-\d{2})\b/;
const DECISION_WORD_RE =
  /\b(decision|decisions|clarification|direction|feedback|approved|accepted|rejected)\b/i;
const DECISION_SECTION_RE = /^(human |key |product |accepted )?decisions\b/i;
const RISK_SECTION_RE = /\brisks?\b|open questions?|blocking questions?/i;
const OPEN_QUESTION_RE = /\bopen question\b/i;
const NEXT_ACTION_RE =
  /^\s*(?:[-*]\s+)?(?:the\s+)?next\s+(?:implementation\s+)?(?:step|action|focus|design|work order|work item|priority)\s+(?:is|should|must)\s+\S|^\s*(?:[-*]\s+)?(?:remaining work|follow[- ]up)\s*:\s*\S/i;
// A work rejection needs a human/owner actor near the verb — "rejected" alone
// is domain vocabulary in review-workflow projects (rejected analogs etc.).
const REJECTION_RE =
  /\b(human|owner)\b[^.]{0,40}\breject(ed|ion)\b|\breject(ed|ion)\b[^.]{0,30}by the (human|owner)|\bnot accepted\b|not employee-ready|acceptance gap/i;
// "failing" followed by test/spec/check vocabulary is TDD instruction
// language ("add a failing test"), not a live blocker.
const HARD_BLOCK_RE =
  /must not start until|is blocked|remains blocked|stays blocked|blocked until|blocked rather than|cannot continue|failing(?!\s+(?:unit\s+|component\s+|integration\s+)?(?:tests?|specs?|checks?)\b)|bug prevents progress|missing required data|dependency unavailable|acceptance gap[^.]{0,80}(prevents completion|blocks completion|blocking)/i;
// "if/when/may be ... blocked" is conditional gate language, not a live blocker.
const CONDITIONAL_BLOCK_RE = /\b(if|when|whether|unless|may be|could be|might be)\b[^.]{0,60}blocked/i;
const HUMAN_GATE_RE =
  /approval pending|pending approval|requires (explicit )?(human |owner )?approval|requires [^.]{0,40}approval|merge[^.]{0,50}requires [^.]{0,30}approval|waiting for (owner )?approval|completed but (requires|pending) approval|done\s*[-:]\s*approval pending|\bsdd gate\b|human acceptance|gated by [^.]{0,30}approval/i;
const REVIEW_SIGNAL_RE =
  /needs review|requires review|pending review|needs verification|requires validation|waiting for validation|final review|human-reviewed sample pending|needs human review|awaiting review/i;
const PAUSED_DEFERRED_RE = /\bpaused\b|on hold|\bdeferred\b|resume later|planned later/i;
const ARCHIVED_DOC_RE = /superseded|historical (evidence|context|plan)|no longer (active|the active)/i;
const BLOCKED_GATED_KEYWORDS = [
  ['approval gate', /\bapproval gate(s)?\b/i],
  ['pending approval', /\bpending approval\b/i],
  ['requires approval', /\brequires [^.]{0,40}approval\b/i],
  ['waiting for approval', /\bwaiting for (owner )?approval\b/i],
  ['needs review', /\bneeds review\b/i],
  ['requires review', /\brequires review\b/i],
  ['needs verification', /\bneeds verification\b/i],
  ['needs validation', /\bneeds validation\b/i],
  ['waiting for validation', /\bwaiting for validation\b/i],
  ['requires validation', /\brequires validation\b/i],
  ['cannot continue', /\bcannot continue\b/i],
  ['paused/deferred', /\bpaused\b|on hold|\bdeferred\b|resume later|planned later/i],
  ['block', /\bblock(?:ed|er|ers|ing|s)?\b/i],
  ['gate', /\bgate(?:d|s|way|keeping)?\b/i],
];
const PROJECT_SIGNAL_CONTEXT_RE =
  /\b(phase|roadmap|task|work item|implementation|feature|bug|current status|progress|remaining work|next action|cannot continue|blocked by|waiting for|pending approval for this (phase|task|implementation)|validation of this feature|audit failed|acceptance failed|merge|implemented phase|current work)\b/i;
const CONCRETE_PROJECT_CONTEXT_RE =
  /\b(phase\s+\d|task\s+\d|work item\s+\d|implementation cannot continue|current work|current phase|this phase|this task|this implementation|audit failed|acceptance failed|blocked by)\b/i;
const AGENT_RULE_CONTEXT_RE =
  /\b(agent|agents|assistant|model|instruction|rule|policy|guideline|standard|must|should|never|always|how to|workflow rule|safety|guardrail|documentation rule|prompt|skill|unsafe action|bypass|execution)\b/i;
const PROCESS_POLICY_CONTEXT_RE =
  /\b(sdd|workflow|checkpoint|all merges|every [^.]{0,30}change|blocked state means|use blocked status|status when|review gate|approval gate is|required by process)\b/i;
const EXAMPLE_TEMPLATE_CONTEXT_RE = /\b(example|template|format|sample|placeholder)\b/i;
const AGENT_RULE_PATH_RE =
  /(^|\/)(agents?|claude)\.md$|(^|\/)(\.claude|skills|\.skills|prompts|documentation-rules|agent-rules)(\/|$)|(^|\/)docs\/agents?\//i;
const PROCESS_POLICY_PATH_RE = /(^|\/)docs\/(rules|process|standards|guidelines)\//i;
const EXAMPLE_TEMPLATE_PATH_RE = /(^|\/)(templates?|examples?)(\/|$)|(^|\/)docs\/(templates?|examples?)\//i;

// ------------------------------------------------------------------ walking

async function collectDocs(projectRoot, documentationViews = null) {
  let entries;
  try {
    entries = await fs.readdir(projectRoot, { withFileTypes: true });
  } catch {
    return null; // project path missing/unreadable
  }
  const ctx = { docs: [], skipped: [], truncated: false, projectRoot, seen: new Set() };
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      skip(ctx, path.join(projectRoot, entry.name), 'symlink');
      continue; // never follow links out of the project
    }
    const lower = entry.name.toLowerCase();
    const full = path.join(projectRoot, entry.name);
    if (entry.isFile() && ROOT_DOC_FILES.has(lower)) {
      await addDoc(ctx, full);
    } else if (entry.isDirectory() && DOC_DIRS.has(lower)) {
      await walkDir(ctx, full, 0);
    } else {
      skip(ctx, full, entry.isDirectory() ? 'root directory is outside scan rules' : 'root file is outside scan rules');
    }
  }
  const configuredRoots = [
    ...(documentationViews?.roadmap?.roots ?? []),
    ...(documentationViews?.specs?.roots ?? []),
  ];
  for (const rawRoot of [...new Set(configuredRoots)]) {
    if (typeof rawRoot !== 'string') continue;
    const normalized = rawRoot.trim().replace(/\\/g, '/').replace(/\/+$/g, '');
    if (
      !normalized ||
      path.isAbsolute(normalized) ||
      normalized.split('/').some((segment) => !segment || segment === '.' || segment === '..')
    ) {
      skip(ctx, rawRoot, 'invalid configured documentation root');
      continue;
    }
    const candidate = path.resolve(projectRoot, ...normalized.split('/'));
    const relative = path.relative(projectRoot, candidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      skip(ctx, candidate, 'configured documentation root escapes project');
      continue;
    }
    const stat = await fs.lstat(candidate).catch(() => null);
    if (!stat?.isDirectory() || stat.isSymbolicLink()) {
      skip(ctx, candidate, 'configured documentation root is unavailable or unsafe');
      continue;
    }
    await walkDir(ctx, candidate, 0);
  }
  ctx.docs.sort((a, b) => a.file.localeCompare(b.file));
  return ctx;
}

async function walkDir(ctx, dir, depth) {
  if (depth > MAX_DEPTH || ctx.truncated) return;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return; // permission denied or vanished directory: skip silently
  }
  for (const entry of entries) {
    if (ctx.truncated) return;
    if (entry.isSymbolicLink()) {
      skip(ctx, path.join(dir, entry.name), 'symlink');
      continue; // no symlinks/junctions, no cycles
    }
    const lower = entry.name.toLowerCase();
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(lower)) await walkDir(ctx, full, depth + 1);
      else skip(ctx, full, 'excluded directory');
    } else if (entry.isFile() && lower.endsWith('.md')) {
      await addDoc(ctx, full);
    } else {
      skip(ctx, full, 'not a markdown documentation file');
    }
  }
}

async function addDoc(ctx, filePath) {
  if (ctx.docs.length >= LIMITS.docs) {
    ctx.truncated = true;
    skip(ctx, filePath, 'documentation file limit reached');
    return;
  }
  try {
    const st = await fs.stat(filePath);
    if (!st.isFile()) {
      skip(ctx, filePath, 'not a regular file');
      return;
    }
    if (st.size > MAX_FILE_SIZE) {
      skip(ctx, filePath, 'larger than 1 MB');
      return;
    }
    const rel = path.relative(ctx.projectRoot, filePath).split(path.sep).join('/');
    if (ctx.seen.has(rel)) return;
    ctx.seen.add(rel);
    ctx.docs.push({
      absPath: filePath,
      file: rel,
      category: classifyDoc(rel),
      sizeBytes: st.size,
      modified: st.mtime.toISOString(),
    });
  } catch (err) {
    skip(ctx, filePath, `unreadable file: ${err.message}`);
  }
}

function skip(ctx, filePath, reason) {
  const rel = path.relative(ctx.projectRoot, filePath).split(path.sep).join('/');
  ctx.skipped.push({ file: rel || filePath, reason });
}

// ------------------------------------------------------------------ parsing

/**
 * Normalize a prose phase Status: line into a distinct status, the rule that
 * matched (for source-of-truth transparency), and a confidence level.
 * Conflicting primary signals pick the safest non-final status at low
 * confidence; approval/review wording is a modifier, not a conflict.
 */
function normalizePhaseProse(text) {
  const t = (text ?? '').toLowerCase();
  if (!t) {
    return { status: 'draft', rule: 'no Status: line found; defaulted to draft', confidence: 'low' };
  }
  const draft = /\bdraft\b|not ready/.test(t);
  const cancelled = /\bcancelled\b|\bcanceled\b/.test(t);
  const superseded = /\bsuperseded\b|replaced by/.test(t);
  const acceptedClosed = /accepted and closed|closed and accepted/.test(t);
  const accepted = /\baccepted\b|human accepted|owner accepted/.test(t) && !/\bnot accepted\b/.test(t);
  const merged = /complete and merged|merged (in)?to `?main`?/.test(t);
  const negatedCompletion = /\bnot (yet )?complete(d)?\b|\bincomplete\b/.test(t);
  const completion =
    !negatedCompletion &&
    /closed as|\bclosed\b|complete(d)? on|gate verified|verified on|\bcompleted\b|\bcomplete\b/.test(t);
  const approval =
    /pending_acceptance|pending acceptance|requires explicit human approval|approval pending|pending approval|requires [^.]{0,30}approval|human acceptance required/.test(t);
  const inProgress = /in progress|currently working/.test(t);
  const deferred = /\bdeferred\b|\bpaused\b|on hold|resume later|planned later/.test(t);
  const blocked = /\bblocked\b|rejected|\bnot accepted\b|acceptance gap|must not start|waiting on/.test(t);
  const review = /needs review|under review|pending [^.]{0,24}review/.test(t);
  const ready = /\bready\b|unblocked/.test(t) && !draft;
  const planned = /not planned|not started|\bplanned\b|scheduled/.test(t);

  // Conflicts among final states and active/deferred/blocked states mean the
  // documentation contradicts itself. Keep the safest non-final status.
  const finalish = acceptedClosed || accepted || merged || completion;
  const primaries = [finalish, inProgress, deferred, blocked].filter(Boolean).length;
  if (primaries > 1) {
    const safest = inProgress ? 'in_progress' : deferred ? 'deferred' : 'blocked';
    return {
      status: safest,
      rule: `conflicting signals (final + ${inProgress ? 'in-progress' : deferred ? 'deferred' : 'blocked'} wording); kept the safest non-final status`,
      confidence: 'low',
    };
  }
  if (cancelled) return { status: 'cancelled', rule: '"cancelled" wording', confidence: 'high' };
  if (superseded) return { status: 'superseded', rule: '"superseded / replaced by" wording', confidence: 'high' };
  if (approval || review) {
    return {
      status: 'pending_acceptance',
      rule: 'approval/review wording maps to pending_acceptance',
      confidence: approval ? 'high' : 'medium',
    };
  }
  if (acceptedClosed || merged || completion) {
    return accepted && !acceptedClosed && !merged && !completion
      ? {
          status: 'accepted',
          rule: '"accepted" wording',
          confidence: 'medium',
        }
      : { status: 'closed', rule: 'completion/closed/merged wording without approval gate', confidence: 'high' };
  }
  if (accepted) {
    return { status: 'accepted', rule: '"accepted" wording', confidence: 'high' };
  }
  if (inProgress) {
    return { status: 'in_progress', rule: '"in progress" wording', confidence: 'high' };
  }
  if (blocked) {
    return { status: 'blocked', rule: 'blocked/rejected/waiting-on wording', confidence: 'high' };
  }
  if (deferred) {
    return { status: 'deferred', rule: '"deferred / paused / on hold" wording', confidence: 'high' };
  }
  if (ready) {
    return { status: 'ready', rule: '"ready / unblocked" wording', confidence: 'high' };
  }
  if (planned) {
    return { status: 'planned', rule: '"planned / not started" wording', confidence: 'high' };
  }
  if (draft) {
    return { status: 'draft', rule: '"draft / not ready" wording', confidence: 'high' };
  }
  return { status: 'draft', rule: 'no known status vocabulary matched; defaulted to draft', confidence: 'low' };
}

const LEADING_PHASE_STATUS_RE = /^(draft|planned|ready|in[_ ]progress|blocked|pending[_ ]acceptance|accepted|closed|deferred|cancelled|canceled|superseded)\b/i;

function canonicalLeadingPhaseStatus(value) {
  return value.toLowerCase().replace(' ', '_').replace('canceled', 'cancelled');
}

function normalizePhase(text) {
  const raw = String(text ?? '').trim();
  if (/^accepted and closed\b|^closed and accepted\b/i.test(raw)) {
    return normalizePhaseProse(raw);
  }

  const leading = raw.match(LEADING_PHASE_STATUS_RE);
  if (!leading) return normalizePhaseProse(raw);

  const status = canonicalLeadingPhaseStatus(leading[1]);
  const remainder = raw.slice(leading[0].length).replace(/^[\s.:;-]+/, '');
  const explanation = remainder ? normalizePhaseProse(remainder) : null;
  const conflicts =
    explanation &&
    !explanation.rule.startsWith('no known status vocabulary') &&
    explanation.status !== status;

  return {
    status,
    rule: `explicit leading lifecycle status "${status}"`,
    confidence: conflicts ? 'low' : 'high',
    issue: conflicts ? 'documentation' : 'none',
    issueNote: conflicts
      ? `The leading status "${status}" is authoritative, but explanatory prose also suggests "${explanation.status}".`
      : null,
  };
}

// Steps/work items inside a phase: "### 4.7.1 Name" style headings.
const STEP_HEADING_RE = /^#{2,4}\s+(\d+(?:\.\d+)+)\s+(\D.+)$/;

/** Classify a step from the text of its section. */
function classifyStep(buffer) {
  const explicitStatus = buffer.match(/\bStatus:\s*([^.;]+)/i)?.[1] ?? null;
  if (explicitStatus) {
    const norm = normalizePhase(explicitStatus);
    return { status: norm.status, rule: `explicit step Status: ${norm.rule}` };
  }
  const b = buffer.toLowerCase();
  if (!b.trim()) return { status: 'draft', rule: 'no section text captured; defaulted to draft' };
  if (/\bblocked\b/.test(b) && !/unblocked/.test(b)) {
    return { status: 'blocked', rule: '"blocked" in step text' };
  }
  if (/\bcancelled\b|\bcanceled\b/.test(b)) return { status: 'cancelled', rule: '"cancelled" in step text' };
  if (/\bsuperseded\b|replaced by/.test(b)) return { status: 'superseded', rule: '"superseded / replaced by" in step text' };
  if (/\bpaused\b|on hold|\bdeferred\b/.test(b)) return { status: 'deferred', rule: '"deferred / paused" in step text' };
  const negated = /\bnot (yet )?(implemented|completed?|done|verified)\b|remains? (pending|open)/.test(b);
  if (
    !negated &&
    /\b(implemented|implementation evidence|completed?|done|verified|passed)\b/.test(b)
  ) {
    return /approval|pending [^.]{0,24}review|receiving [^.]{0,24}review/.test(b)
      ? {
          status: 'pending_acceptance',
          rule: 'completion wording plus approval/review wording in step text',
        }
      : { status: 'pending_acceptance', rule: 'completion wording without explicit acceptance' };
  }
  if (/in progress|currently/.test(b)) {
    return { status: 'in_progress', rule: '"in progress" in step text' };
  }
  if (/needs (human )?review|awaiting review/.test(b)) {
    return { status: 'pending_acceptance', rule: 'review wording in step text' };
  }
  if (/\bpending\b|remaining|not started|\btodo\b/.test(b)) {
    return { status: 'planned', rule: 'pending/remaining wording in step text' };
  }
  return { status: 'draft', rule: 'no explicit step status; defaulted to draft' };
}

/** Collect a Status: value plus its wrapped continuation lines. */
function readMultilineStatus(lines, i, firstPart) {
  let text = firstPart.trim();
  for (let j = i + 1; j < lines.length && text.length < 600; j++) {
    const next = lines[j];
    if (!next.trim() || /^#/.test(next) || STATUS_LINE_RE.test(next)) break;
    text += ' ' + next.trim();
  }
  if (text.length <= 600) return text;
  // Truncate at a word boundary instead of mid-word.
  const cut = text.slice(0, 600);
  return cut.slice(0, cut.lastIndexOf(' ')) + ' …';
}

function matchedBlockedGatedKeywords(text) {
  const found = [];
  for (const [label, re] of BLOCKED_GATED_KEYWORDS) {
    if (re.test(text)) found.push(label);
  }
  return found;
}

function pathBias(file) {
  const f = file.toLowerCase();
  if (EXAMPLE_TEMPLATE_PATH_RE.test(f)) return 'example_or_template';
  if (AGENT_RULE_PATH_RE.test(f)) return 'agent_rule';
  if (PROCESS_POLICY_PATH_RE.test(f)) return 'process_policy';
  return null;
}

function classifyBlockedGatedCandidate({ text, file, line, section, nearbyContext }) {
  const matchedKeywords = matchedBlockedGatedKeywords(text);
  if (matchedKeywords.length === 0) return null;

  const context = [section ?? '', nearbyContext ?? '', text].join(' ');
  const hasConcreteProjectContext = CONCRETE_PROJECT_CONTEXT_RE.test(context);
  const hasProjectContext = PROJECT_SIGNAL_CONTEXT_RE.test(context);
  const hasAgentRuleContext = AGENT_RULE_CONTEXT_RE.test(context);
  const hasProcessPolicyContext = PROCESS_POLICY_CONTEXT_RE.test(context);
  const hasExampleTemplateContext = EXAMPLE_TEMPLATE_CONTEXT_RE.test(context);
  const sourceBias = pathBias(file);

  let classification = 'project_signal';
  let confidence = hasConcreteProjectContext ? 'high' : 'medium';
  let reason = hasConcreteProjectContext
    ? 'concrete project-work context near blocked/gated wording'
    : 'project-work context near blocked/gated wording';

  if (hasExampleTemplateContext || sourceBias === 'example_or_template') {
    classification = 'example_or_template';
    confidence = hasConcreteProjectContext && !hasExampleTemplateContext ? 'medium' : 'high';
    reason =
      sourceBias === 'example_or_template'
        ? 'template/example path defaults to diagnostic-only'
        : 'example/template wording near blocked/gated candidate';
  } else if ((hasAgentRuleContext || sourceBias === 'agent_rule') && !hasConcreteProjectContext) {
    classification = 'agent_rule';
    confidence = sourceBias === 'agent_rule' || hasAgentRuleContext ? 'high' : 'medium';
    reason =
      sourceBias === 'agent_rule'
        ? 'agent-rule path defaults to diagnostic-only'
        : 'agent/instruction/rule wording near blocked/gated candidate';
  } else if ((hasProcessPolicyContext || sourceBias === 'process_policy') && !hasConcreteProjectContext) {
    classification = 'process_policy';
    confidence = sourceBias === 'process_policy' || hasProcessPolicyContext ? 'high' : 'medium';
    reason =
      sourceBias === 'process_policy'
        ? 'process/rules path defaults to diagnostic-only'
        : 'process/workflow policy wording near blocked/gated candidate';
  } else if (!hasProjectContext) {
    classification = sourceBias ?? 'process_policy';
    confidence = sourceBias ? 'medium' : 'low';
    reason = sourceBias
      ? 'path indicates rule/policy/template content and no concrete project-work context was found'
      : 'blocked/gated wording lacks concrete project-work context';
  } else if (sourceBias && !hasConcreteProjectContext) {
    classification = sourceBias;
    confidence = 'medium';
    reason = 'rule-like path requires clearer concrete project-work context';
  }

  return {
    text,
    file,
    line,
    classification,
    includedInProjectStatus: classification === 'project_signal',
    confidence,
    reason,
    matchedKeywords,
    nearbyContext: (nearbyContext || text).slice(0, 500),
  };
}

function classifyWorkSignal(line) {
  if (PAUSED_DEFERRED_RE.test(line)) {
    return { group: 'pausedDeferred', kind: 'paused-deferred', severe: false };
  }
  if (HUMAN_GATE_RE.test(line)) {
    return { group: 'approvalGates', kind: 'approval-gate', severe: false };
  }
  if (REVIEW_SIGNAL_RE.test(line)) {
    return { group: 'needsReview', kind: 'needs-review', severe: false };
  }
  if (REJECTION_RE.test(line)) return { group: 'realBlockers', kind: 'rejection', severe: true };
  if (HARD_BLOCK_RE.test(line) && !CONDITIONAL_BLOCK_RE.test(line)) {
    return { group: 'realBlockers', kind: 'blocked', severe: true };
  }
  return null;
}

function parseDoc(content, doc, acc) {
  const lines = content.split(/\r?\n/);
  let section = null;
  const fileLower = doc.file.toLowerCase();
  const listHeadings = HEADING_FILE_RE.test(doc.file);
  const isRoadmapLike = doc.category === 'roadmap';
  const isHandoffFile = doc.category === 'handoff';
  const isDecisionFile = doc.category === 'decision';
  const isClaudeFile = fileLower === 'claude.md';
  const isOpenSpecFile = /(^|\/)\.?openspec\//.test(fileLower);
  // Rule, checklist, and template documents describe how to work, not what
  // the project's next action is: never source next-action signals from them.
  const allowNextSignals = pathBias(doc.file) === null && doc.category !== 'audit';

  let pendingPhase = null;
  let currentStep = null; // step section being collected ("### 4.7.1 Name")
  let filePhaseId = null; // phase id from a "# Phase N - Name" plan-file title
  let handoffStatus = null;
  let handoffTitle = null;
  let inActiveHandoffSection = false;
  let inOpenSpecScenario = false;

  function finalizeStep() {
    if (!currentStep) return;
    const { status, rule } = classifyStep(currentStep.buffer);
    if (acc.steps.length < LIMITS.steps) {
      acc.steps.push({
        phaseId: currentStep.phaseId,
        id: currentStep.id,
        name: currentStep.name,
        status,
        rule,
        evidence: currentStep.evidence || currentStep.buffer.slice(0, 240).trim(),
        file: currentStep.file,
        line: currentStep.line,
      });
    }
    currentStep = null;
  }
  // An audit doc is archived only when its own Status: line (or the very top
  // of the file) says so — mentions of "superseded" elsewhere are references.
  const ownStatus = content.match(/^Status:\s*(.+)$/im)?.[1] ?? null;
  const perDoc = {
    open: 0,
    completed: 0,
    archivedFlag:
      doc.category === 'audit' &&
      (ownStatus
        ? ARCHIVED_DOC_RE.test(ownStatus)
        : ARCHIVED_DOC_RE.test(content.slice(0, 500))),
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    const heading = line.match(HEADING_RE);
    if (heading) {
      section = heading[2];
      inOpenSpecScenario =
        isOpenSpecFile && heading[1].length === 4 && /^Scenario\s*:/i.test(section.trim());
      inActiveHandoffSection = isClaudeFile && /^active handoff$/i.test(section.trim());
      if (isHandoffFile && !handoffTitle) {
        handoffTitle = section.replace(/^handoff:\s*/i, '').trim();
      }
      if (
        acc.headings.length < LIMITS.headings &&
        (listHeadings || HEADING_TEXT_RE.test(heading[2]))
      ) {
        acc.headings.push({
          text: heading[2].slice(0, 200),
          level: heading[1].length,
          file: doc.file,
          line: lineNo,
        });
      }

      // Any heading ends the current step section.
      finalizeStep();

      // Roadmap phase sections ("## Phase N. Name") and plan titles
      // ("# Phase N - Name") inside any roadmap-like document.
      const phaseMatch = isRoadmapLike
        ? line.match(PHASE_HEADING_SECTION_RE) ?? line.match(PHASE_HEADING_TITLE_RE)
        : null;
      if (phaseMatch && acc.phases.length < LIMITS.phases) {
        if (line.match(PHASE_HEADING_TITLE_RE)) filePhaseId = phaseMatch[1].replace(/\.$/, '');
        pendingPhase = {
          id: phaseMatch[1].replace(/\.$/, ''),
          name: phaseMatch[2].trim().slice(0, 160),
          statusText: '',
          status: 'draft',
          rule: 'no Status: line found; defaulted to draft',
          confidence: 'low',
          issue: 'none',
          issueNote: null,
          branch: null,
          steps: [],
          file: doc.file,
          line: lineNo,
        };
        acc.phases.push(pendingPhase);
        continue;
      }
      if (pendingPhase && heading[1].length <= 3) pendingPhase = null;

      // Step/work-item headings like "### 4.7.1 Add Import Session Registry".
      const stepMatch = isRoadmapLike ? line.match(STEP_HEADING_RE) : null;
      if (stepMatch) {
        const segments = stepMatch[1].split('.');
        currentStep = {
          phaseId: segments.slice(0, -1).join('.'),
          id: stepMatch[1],
          name: stepMatch[2].trim().slice(0, 160),
          buffer: '',
          evidence: '',
          file: doc.file,
          line: lineNo,
        };
      }
      continue;
    }

    // Step section text: collect for status classification + evidence.
    if (currentStep && line.trim() && currentStep.buffer.length < 700) {
      currentStep.buffer += line.trim() + ' ';
      if (
        !currentStep.evidence &&
        /implemented|complete|done|pending|blocked|paused|approval|review|next|remaining|verified|passed/i.test(
          line,
        )
      ) {
        currentStep.evidence = line.trim().slice(0, 240);
      }
    }

    // Prose Status: lines (roadmap phases, phase plans, handoffs).
    const statusMatch = line.match(STATUS_LINE_RE);
    if (statusMatch) {
      if (pendingPhase && !pendingPhase.statusText) {
        pendingPhase.statusText = readMultilineStatus(lines, i, statusMatch[1]);
        const norm = normalizePhase(pendingPhase.statusText);
        pendingPhase.status = norm.status;
        pendingPhase.rule = norm.rule;
        pendingPhase.confidence = norm.confidence;
        pendingPhase.issue = norm.issue ?? pendingPhase.issue;
        pendingPhase.issueNote = norm.issueNote ?? pendingPhase.issueNote;
        pendingPhase.branch = pendingPhase.statusText.match(BRANCH_RE)?.[1] ?? null;
      }
      if (isHandoffFile && handoffStatus === null) {
        const raw = statusMatch[1].trim();
        handoffStatus = /^active/i.test(raw)
          ? 'active'
          : /^done/i.test(raw)
            ? 'done'
            : /archived|stale|historical|superseded/i.test(raw)
              ? 'archived'
              : raw.toLowerCase().slice(0, 40);
      }
    }

    // CLAUDE.md "## Active Handoff" pointer (doc-sync-audit integrity rule).
    if (inActiveHandoffSection && line.trim() && acc.claudePointer === null) {
      acc.claudePointer = line.trim().slice(0, 200);
    }

    const task = line.match(TASK_RE);
    const isCheckedTask = task !== null && task[1] !== ' ';
    if (task) {
      const item = {
        text: task[2].trim().slice(0, 300),
        file: doc.file,
        line: lineNo,
        section,
      };
      if (task[1] === ' ') {
        perDoc.open++;
        if (acc.openTasks.length < LIMITS.tasks) acc.openTasks.push(item);
        if (
          allowNextSignals &&
          section &&
          NEXT_SECTION_RE.test(section) &&
          acc.nextTasks.length < LIMITS.nextTasks
        ) {
          acc.nextTasks.push(item);
        }
      } else {
        perDoc.completed++;
        if (acc.completedTasks.length < LIMITS.tasks) acc.completedTasks.push(item);
      }
      // Checkboxes in a phase-plan file (outside a numbered work item) are
      // steps of that phase.
      if (!currentStep && filePhaseId && acc.steps.length < LIMITS.steps) {
        acc.steps.push({
          phaseId: filePhaseId,
          id: null,
          name: item.text.slice(0, 160),
          status: task[1] === ' ' ? 'planned' : 'closed',
          rule: 'markdown checkbox',
          evidence: item.text.slice(0, 240),
          file: doc.file,
          line: lineNo,
        });
      }
    }

    // TODO/FIXME/BUG + NEXT:/DONE: markers.
    const types = new Set();
    for (const m of line.matchAll(HARD_MARKER_RE)) types.add(m[1]);
    for (const m of line.matchAll(SOFT_MARKER_RE)) types.add(m[1]);
    for (const type of types) {
      acc.markerCounts[type] = (acc.markerCounts[type] ?? 0) + 1;
      if (acc.markers.length < LIMITS.markers) {
        acc.markers.push({
          type,
          text: line.trim().slice(0, 240),
          file: doc.file,
          line: lineNo,
        });
      }
      const standaloneNext = type === 'NEXT' ? line.match(STANDALONE_NEXT_MARKER_RE) : null;
      if (standaloneNext && allowNextSignals && acc.nextTasks.length < LIMITS.nextTasks) {
        acc.nextTasks.push({
          text: standaloneNext[1].trim().slice(0, 300),
          file: doc.file,
          line: lineNo,
          section,
        });
      }
    }

    const trimmed = line.trim();
    if (!trimmed) continue;
    // Markdown table rows are descriptive (file inventories, doc indexes) —
    // they describe blockers/decisions, they are not the blockers themselves.
    if (trimmed.startsWith('|')) continue;

    const isBullet = /^[-*]\s+/.test(trimmed);
    const bulletText = trimmed.replace(/^[-*]\s+/, '').slice(0, 280);

    // Dated decisions, decision-section bullets, *DECISIONS* file bullets.
    if (acc.decisions.length < LIMITS.decisions) {
      const date = trimmed.match(DATE_RE)?.[1] ?? null;
      const inDecisionSection =
        section !== null && DECISION_SECTION_RE.test(section.trim());
      if (
        (date && DECISION_WORD_RE.test(trimmed)) ||
        ((inDecisionSection || isDecisionFile) && isBullet && bulletText.length > 8)
      ) {
        if (!acc.seenDecisions.has(bulletText)) {
          acc.seenDecisions.add(bulletText);
          acc.decisions.push({ date, text: bulletText, file: doc.file, line: lineNo });
        }
      }
    }

    // Risks and open questions: bullets under Risks / Open Questions headings,
    // plus explicit "open question" lines anywhere.
    if (acc.risks.length < LIMITS.risks) {
      const inRiskSection = section !== null && RISK_SECTION_RE.test(section.trim());
      if ((inRiskSection && isBullet && bulletText.length > 8) || OPEN_QUESTION_RE.test(trimmed)) {
        const kind =
          OPEN_QUESTION_RE.test(trimmed) ||
          (section !== null && /question/i.test(section))
            ? 'open-question'
            : 'risk';
        if (!acc.seenRisks.has(bulletText)) {
          acc.seenRisks.add(bulletText);
          acc.risks.push({ kind, text: bulletText, file: doc.file, line: lineNo });
        }
      }
    }

    // Blocked/gated diagnostics are collected first, then only concrete
    // project signals are allowed to affect status, health, and work panels.
    if (acc.blockedGatedCandidates.length < LIMITS.blockedGatedCandidates) {
      const nearbyContext = [lines[i - 1] ?? '', line, lines[i + 1] ?? '']
        .map((x) => x.trim())
        .filter(Boolean)
        .join(' ');
      let candidate = classifyBlockedGatedCandidate({
        text: bulletText,
        file: doc.file,
        line: lineNo,
        section,
        nearbyContext,
      });
      const candidateKey = candidate ? `${candidate.file}:${candidate.line}:${candidate.text}` : null;
      if (candidate && !acc.seenBlockedGatedCandidates.has(candidateKey)) {
        const isOpenSpecNormativeLine =
          inOpenSpecScenario && /^\s*[-*]\s+\*\*(?:WHEN|THEN|AND)\*\*/i.test(line);
        let signal =
          candidate.includedInProjectStatus && !isCheckedTask && !isOpenSpecNormativeLine
            ? classifyWorkSignal(trimmed)
            : null;
        if (isCheckedTask || isOpenSpecNormativeLine) {
          candidate = {
            ...candidate,
            classification: 'process_policy',
            includedInProjectStatus: false,
            confidence: 'high',
            reason: isCheckedTask
              ? 'completed checkbox evidence is not active project work'
              : 'OpenSpec scenario normative context is not active project work',
          };
        }
        // An unchecked plan checkbox is a task, not a live blocker: it only
        // counts as a real blocker when it explicitly says blocked/blocker.
        if (
          signal &&
          signal.group === 'realBlockers' &&
          TASK_RE.test(line) &&
          !/\bblock(?:ed|er|ers)\b/i.test(trimmed)
        ) {
          signal = null;
          candidate = {
            ...candidate,
            classification: 'process_policy',
            includedInProjectStatus: false,
            confidence: 'low',
            reason:
              'unchecked plan checkbox with blocker-like wording is treated as a task, not a live blocker',
          };
        }
        if (candidate.includedInProjectStatus && !signal) {
          candidate = {
            ...candidate,
            classification: 'process_policy',
            includedInProjectStatus: false,
            confidence: 'low',
            reason:
              'project-adjacent blocked/gated wording did not describe a concrete blocker, approval gate, review/validation item, or pause',
          };
        }
        acc.seenBlockedGatedCandidates.add(candidateKey);
        acc.blockedGatedCandidates.push(candidate);
        if (signal && !acc.seenWorkSignals.has(bulletText)) {
          acc.seenWorkSignals.add(bulletText);
          acc.workSignals.push({ ...signal, ...candidate, text: bulletText, file: doc.file, line: lineNo });
        }
      }
    }

    // Prose next actions: "the next implementation step is …", follow-ups.
    if (
      allowNextSignals &&
      acc.nextTasks.length < LIMITS.nextTasks &&
      trimmed.length < 350 &&
      NEXT_ACTION_RE.test(trimmed) &&
      /\b(is|should|must)\b|:/.test(trimmed)
    ) {
      const text = bulletText.slice(0, 300);
      if (!acc.seenNext.has(text)) {
        acc.seenNext.add(text);
        acc.nextTasks.push({ text, file: doc.file, line: lineNo, section });
      }
    }
  }

  finalizeStep();

  if (isHandoffFile) {
    acc.specs.push({
      kind: 'handoff',
      name: handoffTitle || path.basename(doc.file, '.md'),
      file: doc.file,
      status: handoffStatus ?? 'unknown',
    });
  }

  return perDoc;
}

// ---------------------------------------------------- intelligence assembly

function dedupePhases(phases) {
  const byId = new Map();
  for (const ph of phases) {
    const prev = byId.get(ph.id);
    if (!prev) {
      byId.set(ph.id, ph);
      continue;
    }
    const prevIsRoadmap = /(^|\/)roadmap\.md$/i.test(prev.file);
    const curIsRoadmap = /(^|\/)roadmap\.md$/i.test(ph.file);
    if (curIsRoadmap && !prevIsRoadmap) byId.set(ph.id, ph);
  }
  return [...byId.values()].sort((a, b) => {
    const pa = a.id.split('.').map(Number);
    const pb = b.id.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] ?? 0) - (pb[i] ?? 0);
      if (d !== 0) return d;
    }
    return 0;
  });
}

const RESOLVED_PHASE = new Set(['accepted', 'closed']);

function buildSignalGroups(workSignals) {
  return {
    realBlockers: workSignals.filter((s) => s.group === 'realBlockers'),
    approvalGates: workSignals.filter((s) => s.group === 'approvalGates'),
    needsReview: workSignals.filter((s) => s.group === 'needsReview'),
    pausedDeferred: workSignals.filter((s) => s.group === 'pausedDeferred'),
  };
}

function buildBlockedGatedDiagnostics(candidates) {
  const includedProjectSignals = candidates.filter((c) => c.classification === 'project_signal');
  const filteredAgentRules = candidates.filter((c) => c.classification === 'agent_rule');
  const filteredProcessPolicies = candidates.filter((c) => c.classification === 'process_policy');
  const filteredExamplesOrTemplates = candidates.filter((c) => c.classification === 'example_or_template');
  const filteredOutCount =
    filteredAgentRules.length + filteredProcessPolicies.length + filteredExamplesOrTemplates.length;
  return {
    includedProjectSignals,
    filteredAgentRules,
    filteredProcessPolicies,
    filteredExamplesOrTemplates,
    summary: {
      oldRawCandidateCount: candidates.length,
      includedProjectSignalCount: includedProjectSignals.length,
      filteredOutCount,
      filteredAgentRuleCount: filteredAgentRules.length,
      filteredProcessPolicyCount: filteredProcessPolicies.length,
      filteredExampleOrTemplateCount: filteredExamplesOrTemplates.length,
    },
  };
}

/** Attach detected steps to their phases, deduped, plan files preferred. */
function attachSteps(phases, steps) {
  const byId = new Map(phases.map((p) => [p.id, p]));
  const phaseIds = new Set(phases.map((p) => p.id));
  for (const s of steps) {
    if (phaseIds.has(s.id)) continue; // "4.5" heading is a phase, not a step
    const ph = byId.get(s.phaseId);
    if (!ph || ph.steps.length >= 60) continue;
    const key = s.id ?? s.name;
    const existing = ph.steps.find((x) => (x.id ?? x.name) === key);
    if (!existing) {
      ph.steps.push(s);
    } else if (/(^|\/)phases\//.test(s.file) && !/(^|\/)phases\//.test(existing.file)) {
      ph.steps[ph.steps.indexOf(existing)] = s; // detailed plan file wins
    }
  }
  for (const ph of phases) {
    ph.steps.sort((a, b) => (a.id ?? '').localeCompare(b.id ?? '', undefined, { numeric: true }));
  }
}

/**
 * Contradiction pass: a phase marked open while a LATER phase is already
 * accepted/closed usually means a stale Status: line in the docs. Keep
 * the documented status (never invent one from ordering) but lower confidence
 * and flag the suspected issue.
 */
function flagOrderingContradictions(phases) {
  let lastCompleted = -1;
  phases.forEach((p, i) => {
    if (RESOLVED_PHASE.has(p.status)) lastCompleted = i;
  });
  phases.forEach((p, i) => {
    if (
      i < lastCompleted &&
      (p.status === 'draft' || p.status === 'planned' || p.status === 'ready' || p.status === 'in_progress')
    ) {
      p.confidence = 'low';
      p.issue = 'documentation';
      const orderingNote = `Phase ${phases[lastCompleted].id} (later in the roadmap) is already accepted/closed, but this Status: line still says "${p.status.replace('_', ' ')}" — likely stale documentation.`;
      p.issueNote = [p.issueNote, orderingNote].filter(Boolean).join(' ');
    }
    if (p.status === 'draft' && p.confidence === 'low' && p.issue === 'none') {
      p.issue = 'parser';
      p.issueNote = p.statusText
        ? 'The Status: line uses vocabulary the parser does not recognize.'
        : 'No Status: line was found under this phase heading.';
    }
  });
}

function collectOpenSpec(docs) {
  const changes = new Map();
  let specFileCount = 0;
  for (const doc of docs) {
    const parts = doc.file.split('/');
    if (parts[0] === 'specs' || parts[0] === 'openapi') {
      specFileCount++;
      continue;
    }
    if (parts[0] !== '.openspec') continue;
    if (parts[1] === 'changes' && parts.length >= 4) {
      const name = parts[2];
      const entry = changes.get(name) ?? {
        kind: 'openspec',
        name,
        file: parts.slice(0, 3).join('/'),
        status: /\/archive\//i.test(doc.file) ? 'archived' : 'active',
        artifacts: [],
        openTasks: 0,
        completedTasks: 0,
      };
      const base = path.basename(doc.file, '.md').toLowerCase();
      if (['proposal', 'design', 'tasks'].includes(base)) entry.artifacts.push(base);
      entry.openTasks += doc.openTaskCount ?? 0;
      entry.completedTasks += doc.completedTaskCount ?? 0;
      changes.set(name, entry);
    } else {
      specFileCount++;
    }
  }
  return { changes: [...changes.values()], specFileCount };
}

function buildAudits(docs, blockers) {
  const audits = [];
  for (const doc of docs) {
    if (doc.category !== 'audit') continue;
    const severeSignals = blockers.filter((b) => b.file === doc.file && b.severe).length;
    const title = path
      .basename(doc.file, '.md')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const date = doc.file.match(DATE_RE)?.[1] ?? doc.modified.slice(0, 10);
    audits.push({
      file: doc.file,
      title,
      date,
      status: doc.archivedFlag ? 'archived' : severeSignals > 0 ? 'attention' : 'recorded',
      severeSignals,
    });
  }
  audits.sort((a, b) => b.date.localeCompare(a.date));
  return audits;
}

function computeCoverage(docs) {
  const lower = docs.map((d) => d.file.toLowerCase());
  const cats = new Set(docs.map((d) => d.category));
  return {
    readme: lower.includes('readme.md') || lower.includes('docs/readme.md'),
    claude: lower.includes('claude.md'),
    roadmap: cats.has('roadmap'),
    sddOrSpecs: cats.has('spec'),
    audits: cats.has('audit'),
  };
}

function computeGaps(acc, docs, lastModified, coverage) {
  const gaps = [];
  if (!coverage.readme) gaps.push('No README.md found (root or docs/)');
  if (!coverage.roadmap) gaps.push('No roadmap or planning documents found');
  if (!coverage.claude) gaps.push('No CLAUDE.md entry point');
  if (!coverage.sddOrSpecs) gaps.push('No specs, SDD, or design documents found');
  if (!coverage.audits) gaps.push('No audit, review, or verification documents found');

  if (lastModified) {
    const days = Math.floor((Date.now() - Date.parse(lastModified)) / 86_400_000);
    if (days > STALE_DOC_DAYS) gaps.push(`Documentation not updated in ${days} days`);
  }

  // doc-sync-audit rule: a stale Active Handoff pointer is a defect.
  if (acc.claudePointer && !/^none\b/i.test(acc.claudePointer)) {
    const ref = acc.claudePointer.toLowerCase();
    const target = acc.specs.find(
      (s) => s.kind === 'handoff' && ref.includes(path.basename(s.file).toLowerCase()),
    );
    if (!target) {
      gaps.push('CLAUDE.md Active Handoff points to a missing handoff file');
    } else if (target.status !== 'active') {
      gaps.push(`CLAUDE.md Active Handoff points to a ${target.status} handoff`);
    }
  }
  return gaps;
}

// ------------------------------------------------------------------- status

function deriveStatus(acc, docs, lastModified, activeDays, signalGroups) {
  if (!docs || docs.length === 0) {
    return { status: 'unknown', reason: 'No documentation files found' };
  }
  const attention =
    (acc.markerCounts.TODO ?? 0) +
    (acc.markerCounts.FIXME ?? 0) +
    (acc.markerCounts.BUG ?? 0);
  const rejections = signalGroups.realBlockers.filter((b) => b.kind === 'rejection').length;
  const hardBlocks = signalGroups.realBlockers.filter((b) => b.kind === 'blocked' && b.severe).length;
  const reviewItems = signalGroups.needsReview.length;

  if (attention > 0 || rejections > 0 || hardBlocks > 0) {
    const parts = [];
    if (rejections > 0)
      parts.push(`${rejections} rejection/acceptance-gap signal${rejections === 1 ? '' : 's'}`);
    if (hardBlocks > 0)
      parts.push(`${hardBlocks} real blocker${hardBlocks === 1 ? '' : 's'}`);
    if (attention > 0)
      parts.push(`${attention} TODO/FIXME/BUG marker${attention === 1 ? '' : 's'}`);
    return { status: 'needs-attention', reason: `${parts.join(', ')} in documentation` };
  }

  if (reviewItems > 0) {
    return {
      status: 'needs-review',
      reason: `${reviewItems} review/verification signal${reviewItems === 1 ? '' : 's'} in documentation`,
    };
  }

  const recent =
    lastModified !== null &&
    Date.now() - Date.parse(lastModified) <= activeDays * 24 * 60 * 60 * 1000;
  const activePhases = acc.phases.filter((p) => p.status === 'in_progress');
  const currentPhase = activePhases.at(-1) ?? acc.phases.filter((p) => p.status === 'deferred').at(-1) ?? null;
  if (currentPhase?.status === 'deferred') {
    return {
      status: 'paused',
      reason: `current phase ${currentPhase.id} is deferred`,
    };
  }
  const donePhases = acc.phases.filter((p) => RESOLVED_PHASE.has(p.status));
  const pendingAcceptancePhases = acc.phases.filter((p) => p.status === 'pending_acceptance');
  if (
    (signalGroups.approvalGates.length > 0 || pendingAcceptancePhases.length > 0) &&
    activePhases.length === 0
  ) {
    return {
      status: 'pending-approval',
      reason: `${signalGroups.approvalGates.length + pendingAcceptancePhases.length} approval gate${signalGroups.approvalGates.length + pendingAcceptancePhases.length === 1 ? '' : 's'} waiting on owner/SDD approval`,
    };
  }
  const openWorkParts = [];
  if (acc.openTasks.length > 0) openWorkParts.push(`${acc.openTasks.length} open tasks`);
  if (activePhases.length > 0)
    openWorkParts.push(
      `phase ${activePhases
        .slice(0, 3)
        .map((p) => p.id)
        .join(', ')} in progress`,
    );

  if (openWorkParts.length > 0) {
    const what = openWorkParts.join(', ');
    return recent
      ? { status: 'active', reason: `${what}; docs changed within ${activeDays} days` }
      : { status: 'stalled', reason: `${what}; no doc changes within ${activeDays} days` };
  }
  if (acc.completedTasks.length > 0 || donePhases.length > 0) {
    return {
      status: 'done',
      reason:
        donePhases.length > 0
          ? `${donePhases.length} roadmap phase${donePhases.length === 1 ? '' : 's'} complete, no open work found`
          : 'No open tasks; completed tasks exist',
    };
  }
  return recent
    ? { status: 'active', reason: `Docs changed within ${activeDays} days (no task or phase signals found)` }
    : { status: 'stalled', reason: 'No task or phase signals and no recent doc changes' };
}

// ------------------------------------------------------------ health/summary

function computeHealthScore({ coverage, acc, attention, lastModified, status, signalGroups }) {
  if (status === 'unknown') return 15;
  let score = 100;
  const covMissing = Object.values(coverage).filter((v) => !v).length;
  score -= covMissing * 8;

  const rejections = signalGroups.realBlockers.filter((b) => b.kind === 'rejection').length;
  const hardBlocks = signalGroups.realBlockers.filter((b) => b.kind === 'blocked' && b.severe).length;
  score -= Math.min(25, rejections * 5);
  score -= Math.min(30, hardBlocks * 8);
  score -= Math.min(8, signalGroups.approvalGates.length * 2);
  score -= Math.min(10, signalGroups.needsReview.length * 3);
  if (acc.phases.some((p) => p.status === 'deferred')) score -= Math.min(6, signalGroups.pausedDeferred.length * 2);
  score -= Math.min(12, attention * 3);

  if (lastModified) {
    const days = Math.floor((Date.now() - Date.parse(lastModified)) / 86_400_000);
    if (days > STALE_DOC_DAYS) score -= 15;
    else if (days > 14) score -= 8;
  }

  const hasNext =
    acc.nextTasks.length > 0 || acc.phases.some((p) => p.status === 'in_progress');
  if (!hasNext) score -= 10;
  if (acc.openTasks.length > 0 && acc.completedTasks.length === 0 && acc.phases.length === 0) {
    score -= 5;
  }
  return Math.max(5, Math.min(100, Math.round(score)));
}

function buildSummary({ acc, coverage, status, lastModified, attention, docs, signalGroups }) {
  const fileCategory = new Map((docs ?? []).map((d) => [d.file, d.category]));
  // Current phase is an explicit trusted identity: exactly one in-progress
  // phase. Ambiguity (several in progress) and gates (pending acceptance)
  // stay null instead of fabricating a current phase.
  const activePhases = acc.phases.filter((p) => p.status === 'in_progress');
  const currentPhase = activePhases.length === 1 ? activePhases[0] : null;

  // Prefer live planning signals from roadmap docs over checklist meta-text.
  const scoreNext = (t) =>
    (/(the )?next (implementation |safe )?(step|focus|action)/i.test(t.text) ? 2 : 0) +
    (/^(the |its |the current )?next\b/i.test(t.text) ? 3 : 0) +
    (fileCategory.get(t.file) === 'roadmap' ? 1 : 0);
  // Sort the whole list so focus cards and the Tasks tab lead with the
  // strongest next-action candidates.
  acc.nextTasks.sort((a, b) => scoreNext(b) - scoreNext(a));
  const nextAction = acc.nextTasks[0] ?? null;

  const scoreBlocker = (b) =>
    (b.kind === 'rejection' ? 2 : 0) + (fileCategory.get(b.file) === 'roadmap' ? 1 : 0);
  const mainBlocker =
    [...signalGroups.realBlockers.filter((b) => b.severe)].sort(
      (a, b) => scoreBlocker(b) - scoreBlocker(a),
    )[0] ?? null;

  const recentDecision = acc.decisions.find((d) => d.date) ?? acc.decisions[0] ?? null;
  const recentDoc =
    docs && docs.length > 0
      ? [...docs].sort((a, b) => b.modified.localeCompare(a.modified))[0]
      : null;
  return {
    status,
    healthScore: computeHealthScore({ coverage, acc, attention, lastModified, status, signalGroups }),
    currentPhase: currentPhase ? `${currentPhase.id} ${currentPhase.name}` : null,
    nextAction: nextAction?.text ?? null,
    mainBlocker: mainBlocker?.text ?? null,
    mainRisk: acc.risks[0]?.text ?? null,
    recentDecision: recentDecision?.text ?? null,
    recentChange: recentDoc ? recentDoc.file : null,
    docsCoverage: coverage,
  };
}

// -------------------------------------------------------------------- main

async function scanProject(entry, activeDays) {
  const acc = {
    openTasks: [],
    completedTasks: [],
    nextTasks: [],
    markers: [],
    headings: [],
    markerCounts: {},
    phases: [],
    steps: [],
    decisions: [],
    blockers: [],
    workSignals: [],
    blockedGatedCandidates: [],
    risks: [],
    specs: [],
    claudePointer: null,
    seenDecisions: new Set(),
    seenWorkSignals: new Set(),
    seenBlockedGatedCandidates: new Set(),
    seenNext: new Set(),
    seenRisks: new Set(),
  };

  const collected = await collectDocs(entry.path, entry.documentationViews);
  const docs = collected ? collected.docs : null;
  const skipped = collected ? collected.skipped : [];
  if (collected?.truncated) {
    console.warn(
      `  warning: ${entry.name} has more than ${LIMITS.docs} documentation files; scan truncated`,
    );
  }
  if (docs) {
    for (const doc of docs) {
      try {
        const content = await fs.readFile(doc.absPath, 'utf8');
        doc.content = content;
        const perDoc = parseDoc(content, doc, acc);
        doc.openTaskCount = perDoc.open;
        doc.completedTaskCount = perDoc.completed;
        doc.archivedFlag = perDoc.archivedFlag;
      } catch (err) {
        skipped.push({ file: doc.file, reason: `unreadable file: ${err.message}` });
      }
    }
  }

  const roadmapRoots = entry.documentationViews?.roadmap?.roots ?? [];
  if (roadmapRoots.length > 0) {
    const inRoadmapRoots = (file) => roadmapRoots.some((root) => file === root || file.startsWith(`${root.replace(/\\/g, '/').replace(/\/+$/, '')}/`));
    acc.phases = acc.phases.filter((phase) => inRoadmapRoots(phase.file));
    acc.steps = acc.steps.filter((step) => inRoadmapRoots(step.file));
  }
  acc.phases = dedupePhases(acc.phases);
  attachSteps(acc.phases, acc.steps);
  flagOrderingContradictions(acc.phases);
  acc.decisions.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const blockedGatedDiagnostics = buildBlockedGatedDiagnostics(acc.blockedGatedCandidates);
  const signalGroups = buildSignalGroups(acc.workSignals);
  acc.blockers = signalGroups.realBlockers;

  const { changes: openspecChanges, specFileCount } = collectOpenSpec(docs ?? []);
  acc.specs.push(...openspecChanges);
  const specWork = buildSpecWork({
    projectId: entry.id ?? entry.path,
    docs: docs ?? [],
    documentationViews: entry.documentationViews,
    truncated: Boolean(collected?.truncated),
  });

  const lastModified =
    docs && docs.length > 0 ? docs.map((d) => d.modified).sort().at(-1) : null;

  const coverage = docs
    ? computeCoverage(docs)
    : { readme: false, claude: false, roadmap: false, sddOrSpecs: false, audits: false };
  const gaps = docs ? computeGaps(acc, docs, lastModified, coverage) : [];
  const audits = docs ? buildAudits(docs, acc.blockers) : [];
  const { status, reason } = deriveStatus(acc, docs, lastModified, activeDays, signalGroups);

  const attention =
    (acc.markerCounts.TODO ?? 0) +
    (acc.markerCounts.FIXME ?? 0) +
    (acc.markerCounts.BUG ?? 0);
  const summary = buildSummary({ acc, coverage, status, lastModified, attention, docs, signalGroups });
  const totalTasks = acc.openTasks.length + acc.completedTasks.length;

  return {
    id: entry.id ?? entry.path,
    name: entry.name,
    path: entry.path,
    status,
    statusReason: reason,
    lastModified,
    error: docs === null ? 'Project path not found or not readable' : null,
    summary,
    openTasks: acc.openTasks,
    completedTasks: acc.completedTasks,
    nextTasks: acc.nextTasks,
    markers: acc.markers,
    headings: acc.headings,
    phases: acc.phases,
    decisions: acc.decisions,
    blockers: acc.blockers,
    signalGroups,
    blockedGatedDiagnostics,
    risks: acc.risks,
    specs: acc.specs,
    specFileCount,
    specWork,
    audits,
    gaps,
    intel: {
      readmeFound: coverage.readme,
      roadmapFound: coverage.roadmap,
      claudeFound: coverage.claude,
      specsFound: coverage.sddOrSpecs,
      openTaskCount: acc.openTasks.length,
      completedTaskCount: acc.completedTasks.length,
      attentionMarkerCount: attention,
      lastDocUpdate: lastModified,
    },
    docs: (docs ?? []).map(({ absPath: _absPath, archivedFlag: _a, content: _content, ...rest }) => rest),
    stats: {
      docsCount: docs ? docs.length : 0,
      totalSizeBytes: (docs ?? []).reduce((sum, d) => sum + d.sizeBytes, 0),
      openTaskCount: acc.openTasks.length,
      completedTaskCount: acc.completedTasks.length,
      nextTaskCount: acc.nextTasks.length,
      markerCounts: acc.markerCounts,
      completionPercent:
        totalTasks > 0
          ? Math.round((acc.completedTasks.length / totalTasks) * 100)
          : null,
    },
    _scan: {
      skippedFilesCount: skipped.length,
      skipped,
    },
  };
}

export async function runScan(options = {}) {
  const {
    configPath = DEFAULT_CONFIG_PATH,
    outputPath = DEFAULT_OUTPUT_PATH,
    quiet = false,
    logger = console,
  } = options;
  const startedAt = Date.now();
  if (configPath === DEFAULT_CONFIG_PATH) {
    await ensureProjectConfig({
      appDataDir: path.dirname(DEFAULT_CONFIG_PATH),
    });
  }
  let config;
  try {
    config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  } catch (err) {
    throw new Error(`Cannot read ${configPath}: ${err.message}`);
  }
  const configuredProjects = Array.isArray(config.projects) ? config.projects : [];
  const projectsToScan = configuredProjects.filter((project) => project?.enabled !== false);
  const activeDays = Number.isFinite(config.settings?.activeDays)
    ? config.settings.activeDays
    : Number.isFinite(config.activeDays)
      ? config.activeDays
      : DEFAULT_ACTIVE_DAYS;

  if (!quiet) logger.log(`Scanning ${projectsToScan.length} enabled project(s) from projects.config.json\n`);

  const projects = [];
  let scannedFilesCount = 0;
  let skippedFilesCount = 0;
  const skippedFiles = [];
  for (const entry of projectsToScan) {
    if (!entry?.name || typeof entry.path !== 'string' || entry.path.trim() === '') {
      if (!quiet) logger.warn('  skipping config entry without a valid name/path:', JSON.stringify(entry));
      skippedFilesCount += 1;
      skippedFiles.push({
        project: entry?.name ?? '(unknown)',
        file: '(config entry)',
        reason: 'invalid name/path',
      });
      continue;
    }
    const result = await scanProject(entry, activeDays);
    const { _scan, ...publicResult } = result;
    scannedFilesCount += publicResult.stats.docsCount;
    skippedFilesCount += _scan.skippedFilesCount;
    for (const skipped of _scan.skipped) {
      skippedFiles.push({ project: publicResult.name, ...skipped });
    }
    projects.push(publicResult);

    if (!quiet) {
      logger.log(
        `  ${publicResult.name}: ${publicResult.status} (health ${publicResult.summary.healthScore}) | ` +
          `docs ${publicResult.stats.docsCount} | phases ${publicResult.phases.length} | ` +
          `raw constraints ${publicResult.blockedGatedDiagnostics.summary.oldRawCandidateCount} | ` +
          `next ${publicResult.nextTasks.length} | real blockers ${publicResult.signalGroups.realBlockers.length} | ` +
          `approval gates ${publicResult.signalGroups.approvalGates.length} | review ${publicResult.signalGroups.needsReview.length} | paused ${publicResult.signalGroups.pausedDeferred.length} | ` +
          `risks ${publicResult.risks.length} | audits ${publicResult.audits.length} | gaps ${publicResult.gaps.length}` +
          `${publicResult.error ? ` | ERROR: ${publicResult.error}` : ''}`,
      );
      for (const skipped of _scan.skipped.slice(0, 50)) {
        logger.warn(`  skipped ${publicResult.name}: ${skipped.file} (${skipped.reason})`);
      }
      if (_scan.skipped.length > 50) {
        logger.warn(`  skipped ${publicResult.name}: ${_scan.skipped.length - 50} more item(s)`);
      }
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    activeDays,
    projects,
  };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');

  const durationMs = Date.now() - startedAt;
  if (!quiet) {
    logger.log(
      `\nDone in ${durationMs} ms: ${projects.length} project(s).` +
        `\nScanned ${scannedFilesCount} file(s), skipped ${skippedFilesCount} item(s).` +
        `\nWrote ${path.relative(__dirname, outputPath)}`,
    );
  }

  return {
    output,
    status: {
      durationMs,
      scannedFilesCount,
      skippedFilesCount,
      skippedFiles,
    },
  };
}

async function main() {
  const startedAt = Date.now();
  await ensureProjectConfig({
    appDataDir: path.dirname(CONFIG_PATH),
  });
  let config;
  try {
    config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
  } catch (err) {
    console.error(`Cannot read ${CONFIG_PATH}: ${err.message}`);
    process.exit(1);
  }
  const configuredProjects = Array.isArray(config.projects) ? config.projects : [];
  const projectsToScan = configuredProjects.filter((project) => project?.enabled !== false);
  const activeDays = Number.isFinite(config.settings?.activeDays)
    ? config.settings.activeDays
    : Number.isFinite(config.activeDays)
      ? config.activeDays
      : DEFAULT_ACTIVE_DAYS;

  console.log(`Scanning ${projectsToScan.length} enabled project(s) from projects.config.json\n`);

  const projects = [];
  for (const entry of projectsToScan) {
    if (!entry?.name || typeof entry.path !== 'string' || entry.path.trim() === '') {
      console.warn('  skipping config entry without a valid name/path:', JSON.stringify(entry));
      continue;
    }
    const result = await scanProject(entry, activeDays);
    projects.push(result);
    console.log(
        `  ${result.name}: ${result.status} (health ${result.summary.healthScore}) | ` +
        `docs ${result.stats.docsCount} | phases ${result.phases.length} | ` +
        `raw constraints ${result.blockedGatedDiagnostics.summary.oldRawCandidateCount} | ` +
        `next ${result.nextTasks.length} | real blockers ${result.signalGroups.realBlockers.length} | ` +
        `approval gates ${result.signalGroups.approvalGates.length} | review ${result.signalGroups.needsReview.length} | paused ${result.signalGroups.pausedDeferred.length} | ` +
        `risks ${result.risks.length} | audits ${result.audits.length} | gaps ${result.gaps.length}` +
        `${result.error ? ` | ERROR: ${result.error}` : ''}`,
    );

    if (result.phases.length > 0) {
      console.log(`\n  Roadmap Status Diagnostics — ${result.name}`);
      for (const ph of result.phases) {
        console.log(
          `    ${ph.id.padEnd(5)} ${ph.status.padEnd(29)} conf=${ph.confidence.padEnd(7)}` +
            `steps=${String(ph.steps.length).padEnd(3)} ${ph.file}:${ph.line}`,
        );
        console.log(`          raw: ${(ph.statusText || '(no Status: line)').slice(0, 100)}`);
        console.log(`          rule: ${ph.rule}`);
        if (ph.issue !== 'none') {
          console.log(`          SUSPECTED ISSUE (${ph.issue}): ${ph.issueNote ?? ''}`);
        }
      }
      console.log('');
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    activeDays,
    projects,
  };
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

  const byStatus = {};
  for (const p of projects) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  const summary = Object.entries(byStatus)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
  console.log(
    `\nDone in ${Date.now() - startedAt} ms: ${projects.length} project(s) (${summary}).` +
      `\nWrote ${path.relative(__dirname, OUTPUT_PATH)}`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runScan().catch((err) => {
    console.error(`Scan failed: ${err.message}`);
    process.exit(1);
  });
}
