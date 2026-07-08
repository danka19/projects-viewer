#!/usr/bin/env node
/**
 * Read-only documentation scanner.
 *
 * Reads projects.config.json, scans ONLY documentation files inside each
 * configured project, and writes src/data/projects.json for the dashboard.
 * It never writes to, moves, or modifies any file in the scanned projects.
 *
 * Safety boundaries:
 * - visits only the project roots listed in projects.config.json;
 * - inside a root, enters only docs/, specs/, .openspec/, openapi/;
 * - never follows symlinks or junctions (no disk escape, no cycles);
 * - recursion depth and per-project file count are capped;
 * - reads only *.md files up to 1 MB; everything else is ignored;
 * - the only write is src/data/projects.json inside this dashboard folder.
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'projects.config.json');
const OUTPUT_PATH = path.join(__dirname, 'src', 'data', 'projects.json');

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
const DOC_DIRS = new Set(['docs', 'specs', '.openspec', 'openapi']);
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
  /\bnext\b[^.]{0,60}\b(step|action|focus|design|work order|work item|priority)\b|\bremaining work\b|\bfollow[- ]up\b/i;
// A work rejection needs a human/owner actor near the verb — "rejected" alone
// is domain vocabulary in review-workflow projects (rejected analogs etc.).
const REJECTION_RE =
  /\b(human|owner)\b[^.]{0,40}\breject(ed|ion)\b|\breject(ed|ion)\b[^.]{0,30}by the (human|owner)|\bnot accepted\b|not employee-ready|acceptance gap/i;
const HARD_BLOCK_RE =
  /must not start until|is blocked|remains blocked|stays blocked|blocked until|blocked rather than/i;
// "if/when/may be ... blocked" is conditional gate language, not a live blocker.
const CONDITIONAL_BLOCK_RE = /\b(if|when|whether|unless|may be|could be|might be)\b[^.]{0,60}blocked/i;
const HUMAN_GATE_RE =
  /requires explicit human approval|human acceptance|awaiting (human|owner)|owner[- ]approv|human owner (must|has to)|approval pending|pending approval|needs human review/i;
const ARCHIVED_DOC_RE = /superseded|historical (evidence|context|plan)|no longer (active|the active)/i;

// ------------------------------------------------------------------ walking

async function collectDocs(projectRoot) {
  let entries;
  try {
    entries = await fs.readdir(projectRoot, { withFileTypes: true });
  } catch {
    return null; // project path missing/unreadable
  }
  const ctx = { docs: [], truncated: false, projectRoot };
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue; // never follow links out of the project
    const lower = entry.name.toLowerCase();
    const full = path.join(projectRoot, entry.name);
    if (entry.isFile() && ROOT_DOC_FILES.has(lower)) {
      await addDoc(ctx, full);
    } else if (entry.isDirectory() && DOC_DIRS.has(lower)) {
      await walkDir(ctx, full, 0);
    }
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
    if (entry.isSymbolicLink()) continue; // no symlinks/junctions, no cycles
    const lower = entry.name.toLowerCase();
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(lower)) await walkDir(ctx, full, depth + 1);
    } else if (entry.isFile() && lower.endsWith('.md')) {
      await addDoc(ctx, full);
    }
  }
}

async function addDoc(ctx, filePath) {
  if (ctx.docs.length >= LIMITS.docs) {
    ctx.truncated = true;
    return;
  }
  try {
    const st = await fs.stat(filePath);
    if (!st.isFile() || st.size > MAX_FILE_SIZE) return;
    const rel = path.relative(ctx.projectRoot, filePath).split(path.sep).join('/');
    ctx.docs.push({
      absPath: filePath,
      file: rel,
      category: classifyDoc(rel),
      sizeBytes: st.size,
      modified: st.mtime.toISOString(),
    });
  } catch {
    /* unreadable file: skip */
  }
}

// ------------------------------------------------------------------ parsing

/**
 * Normalize a prose phase Status: line into a distinct status, the rule that
 * matched (for source-of-truth transparency), and a confidence level.
 * Conflicting primary signals pick the safest non-final status at low
 * confidence; approval/review wording is a modifier, not a conflict.
 */
function normalizePhase(text) {
  const t = (text ?? '').toLowerCase();
  if (!t) {
    return { status: 'unknown', rule: 'no Status: line found', confidence: 'low' };
  }
  const merged = /complete and merged|merged (in)?to `?main`?/.test(t);
  const completion = /closed as|complete(d)? on|gate verified|verified on|\bcompleted\b/.test(t);
  const approval =
    /requires explicit human approval|approval pending|pending approval|requires [^.]{0,30}approval|human acceptance required/.test(t);
  const inProgress = /in progress|currently working/.test(t);
  const paused = /\bpaused\b|on hold/.test(t);
  const blocked = /\bblocked\b|must not start|waiting on|\bgated\b/.test(t);
  const review = /needs review|under review|pending [^.]{0,24}review/.test(t);
  const planned = /not planned|not started|\bplanned\b|scheduled/.test(t);

  // Conflicts among primary states (completion vs in-progress vs paused vs
  // blocked) mean the documentation contradicts itself.
  const primaries = [merged || completion, inProgress, paused, blocked].filter(Boolean).length;
  if (primaries > 1) {
    const safest = inProgress ? 'in_progress' : paused ? 'paused' : 'blocked';
    return {
      status: safest,
      rule: `conflicting signals (completion + ${inProgress ? 'in-progress' : paused ? 'paused' : 'blocked'} wording); kept the safest non-final status`,
      confidence: 'low',
    };
  }
  if (merged) {
    return review
      ? {
          status: 'completed',
          rule: 'merged to main, with a pending-review caveat in the same line',
          confidence: 'medium',
        }
      : { status: 'completed', rule: '"complete and merged to main" wording', confidence: 'high' };
  }
  if (completion && approval) {
    return {
      status: 'completed_pending_approval',
      rule: 'completion wording ("complete on / closed as / gate verified") plus explicit human-approval requirement',
      confidence: 'high',
    };
  }
  if (completion) {
    return {
      status: 'completed',
      rule: 'completion wording without merge or approval context',
      confidence: 'medium',
    };
  }
  if (inProgress) {
    return { status: 'in_progress', rule: '"in progress" wording', confidence: 'high' };
  }
  if (paused) {
    return { status: 'paused', rule: '"paused / on hold" wording', confidence: 'high' };
  }
  if (blocked) {
    return { status: 'blocked', rule: 'blocked/gated/waiting-on wording', confidence: 'high' };
  }
  if (approval) {
    return {
      status: 'pending_approval',
      rule: 'approval wording without clear completion wording',
      confidence: 'medium',
    };
  }
  if (review) {
    return { status: 'needs_review', rule: 'review wording without completion wording', confidence: 'medium' };
  }
  if (planned) {
    return { status: 'planned', rule: '"planned / not started" wording', confidence: 'high' };
  }
  return { status: 'unknown', rule: 'no known status vocabulary matched', confidence: 'low' };
}

// Steps/work items inside a phase: "### 4.7.1 Name" style headings.
const STEP_HEADING_RE = /^#{2,4}\s+(\d+(?:\.\d+)+)\s+(\D.+)$/;

/** Classify a step from the text of its section. */
function classifyStep(buffer) {
  const b = buffer.toLowerCase();
  if (!b.trim()) return { status: 'unknown', rule: 'no section text captured' };
  if (/\bblocked\b/.test(b) && !/unblocked/.test(b)) {
    return { status: 'blocked', rule: '"blocked" in step text' };
  }
  if (/\bpaused\b|on hold/.test(b)) return { status: 'paused', rule: '"paused" in step text' };
  const negated = /\bnot (yet )?(implemented|completed?|done|verified)\b|remains? (pending|open)/.test(b);
  if (
    !negated &&
    /\b(implemented|implementation evidence|completed?|done|verified|passed)\b/.test(b)
  ) {
    return /approval|pending [^.]{0,24}review|receiving [^.]{0,24}review/.test(b)
      ? {
          status: 'completed_pending_approval',
          rule: 'completion wording plus approval/review wording in step text',
        }
      : { status: 'completed', rule: 'completion wording in step text' };
  }
  if (/in progress|currently/.test(b)) {
    return { status: 'in_progress', rule: '"in progress" in step text' };
  }
  if (/needs (human )?review|awaiting review/.test(b)) {
    return { status: 'needs_review', rule: 'review wording in step text' };
  }
  if (/\bpending\b|remaining|not started|\btodo\b/.test(b)) {
    return { status: 'pending', rule: 'pending/remaining wording in step text' };
  }
  return { status: 'unknown', rule: 'no status vocabulary in step text' };
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

function classifyBlocker(line) {
  if (REJECTION_RE.test(line)) return { kind: 'rejection', severe: true };
  if (HARD_BLOCK_RE.test(line) && !CONDITIONAL_BLOCK_RE.test(line)) {
    return { kind: 'blocked', severe: true };
  }
  if (/\bpaused\b/i.test(line)) return { kind: 'blocked', severe: false };
  if (HUMAN_GATE_RE.test(line)) return { kind: 'human-gate', severe: false };
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

  let pendingPhase = null;
  let currentStep = null; // step section being collected ("### 4.7.1 Name")
  let filePhaseId = null; // phase id from a "# Phase N - Name" plan-file title
  let handoffStatus = null;
  let handoffTitle = null;
  let inActiveHandoffSection = false;

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
          status: 'unknown',
          rule: 'no Status: line found',
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
          status: task[1] === ' ' ? 'pending' : 'completed',
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
      if (type === 'NEXT' && acc.nextTasks.length < LIMITS.nextTasks) {
        acc.nextTasks.push({
          text: line.trim().replace(/^.*?NEXT\s*:\s*/, '').slice(0, 300) || line.trim().slice(0, 300),
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

    // Blocked / rejected / human-gated work.
    if (acc.blockers.length < LIMITS.blockers) {
      const blocker = classifyBlocker(trimmed);
      if (blocker && !acc.seenBlockers.has(bulletText)) {
        acc.seenBlockers.add(bulletText);
        acc.blockers.push({ ...blocker, text: bulletText, file: doc.file, line: lineNo });
      }
    }

    // Prose next actions: "the next implementation step is …", follow-ups.
    if (
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

const COMPLETED_PHASE = new Set(['completed', 'completed_pending_approval']);

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
 * Contradiction pass: a phase marked in_progress/planned while a LATER phase
 * is already completed usually means a stale Status: line in the docs. Keep
 * the documented status (never invent one from ordering) but lower confidence
 * and flag the suspected issue.
 */
function flagOrderingContradictions(phases) {
  let lastCompleted = -1;
  phases.forEach((p, i) => {
    if (COMPLETED_PHASE.has(p.status)) lastCompleted = i;
  });
  phases.forEach((p, i) => {
    if (i < lastCompleted && (p.status === 'in_progress' || p.status === 'planned')) {
      p.confidence = 'low';
      p.issue = 'documentation';
      p.issueNote = `Phase ${phases[lastCompleted].id} (later in the roadmap) is already completed, but this Status: line still says "${p.status.replace('_', ' ')}" — likely stale documentation.`;
    }
    if (p.status === 'unknown' && p.issue === 'none') {
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

function deriveStatus(acc, docs, lastModified, activeDays) {
  if (!docs || docs.length === 0) {
    return { status: 'unknown', reason: 'No documentation files found' };
  }
  const attention =
    (acc.markerCounts.TODO ?? 0) +
    (acc.markerCounts.FIXME ?? 0) +
    (acc.markerCounts.BUG ?? 0);
  const rejections = acc.blockers.filter((b) => b.kind === 'rejection').length;
  const hardBlocks = acc.blockers.filter((b) => b.kind === 'blocked' && b.severe).length;

  if (attention > 0 || rejections > 0 || hardBlocks > 0) {
    const parts = [];
    if (rejections > 0)
      parts.push(`${rejections} rejection/acceptance-gap signal${rejections === 1 ? '' : 's'}`);
    if (hardBlocks > 0)
      parts.push(`${hardBlocks} blocked-work signal${hardBlocks === 1 ? '' : 's'}`);
    if (attention > 0)
      parts.push(`${attention} TODO/FIXME/BUG marker${attention === 1 ? '' : 's'}`);
    return { status: 'needs-attention', reason: `${parts.join(', ')} in documentation` };
  }

  const recent =
    lastModified !== null &&
    Date.now() - Date.parse(lastModified) <= activeDays * 24 * 60 * 60 * 1000;
  const activePhases = acc.phases.filter((p) => p.status === 'in_progress');
  const donePhases = acc.phases.filter(
    (p) => COMPLETED_PHASE.has(p.status),
  );
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

function computeHealthScore({ coverage, acc, attention, lastModified, status }) {
  if (status === 'unknown') return 15;
  let score = 100;
  const covMissing = Object.values(coverage).filter((v) => !v).length;
  score -= covMissing * 8;

  const rejections = acc.blockers.filter((b) => b.kind === 'rejection').length;
  const hardBlocks = acc.blockers.filter((b) => b.kind === 'blocked' && b.severe).length;
  score -= Math.min(20, rejections * 4);
  score -= Math.min(18, hardBlocks * 6);
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

function buildSummary({ acc, coverage, status, lastModified, attention, docs }) {
  const fileCategory = new Map((docs ?? []).map((d) => [d.file, d.category]));
  const activePhases = acc.phases.filter((p) => p.status === 'in_progress');
  const currentPhase =
    activePhases.length > 0
      ? activePhases[activePhases.length - 1]
      : (acc.phases.filter((p) => p.status === 'completed_pending_approval').at(-1) ?? null);

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
    [...acc.blockers.filter((b) => b.severe)].sort(
      (a, b) => scoreBlocker(b) - scoreBlocker(a),
    )[0] ?? null;

  const recentDecision = acc.decisions.find((d) => d.date) ?? acc.decisions[0] ?? null;
  const recentDoc =
    docs && docs.length > 0
      ? [...docs].sort((a, b) => b.modified.localeCompare(a.modified))[0]
      : null;
  return {
    status,
    healthScore: computeHealthScore({ coverage, acc, attention, lastModified, status }),
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
    risks: [],
    specs: [],
    claudePointer: null,
    seenDecisions: new Set(),
    seenBlockers: new Set(),
    seenNext: new Set(),
    seenRisks: new Set(),
  };

  const collected = await collectDocs(entry.path);
  const docs = collected ? collected.docs : null;
  if (collected?.truncated) {
    console.warn(
      `  warning: ${entry.name} has more than ${LIMITS.docs} documentation files; scan truncated`,
    );
  }
  if (docs) {
    for (const doc of docs) {
      try {
        const content = await fs.readFile(doc.absPath, 'utf8');
        const perDoc = parseDoc(content, doc, acc);
        doc.openTaskCount = perDoc.open;
        doc.completedTaskCount = perDoc.completed;
        doc.archivedFlag = perDoc.archivedFlag;
      } catch {
        /* unreadable file: skip */
      }
    }
  }

  acc.phases = dedupePhases(acc.phases);
  attachSteps(acc.phases, acc.steps);
  flagOrderingContradictions(acc.phases);
  acc.decisions.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  const { changes: openspecChanges, specFileCount } = collectOpenSpec(docs ?? []);
  acc.specs.push(...openspecChanges);

  const lastModified =
    docs && docs.length > 0 ? docs.map((d) => d.modified).sort().at(-1) : null;

  const coverage = docs
    ? computeCoverage(docs)
    : { readme: false, claude: false, roadmap: false, sddOrSpecs: false, audits: false };
  const gaps = docs ? computeGaps(acc, docs, lastModified, coverage) : [];
  const audits = docs ? buildAudits(docs, acc.blockers) : [];
  const { status, reason } = deriveStatus(acc, docs, lastModified, activeDays);

  const attention =
    (acc.markerCounts.TODO ?? 0) +
    (acc.markerCounts.FIXME ?? 0) +
    (acc.markerCounts.BUG ?? 0);
  const summary = buildSummary({ acc, coverage, status, lastModified, attention, docs });
  const totalTasks = acc.openTasks.length + acc.completedTasks.length;

  return {
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
    risks: acc.risks,
    specs: acc.specs,
    specFileCount,
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
    docs: (docs ?? []).map(({ absPath: _absPath, archivedFlag: _a, ...rest }) => rest),
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
  };
}

async function main() {
  const startedAt = Date.now();
  let config;
  try {
    config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
  } catch (err) {
    console.error(`Cannot read ${CONFIG_PATH}: ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(config.projects) || config.projects.length === 0) {
    console.error('projects.config.json must contain a non-empty "projects" array.');
    process.exit(1);
  }
  const activeDays = Number.isFinite(config.activeDays)
    ? config.activeDays
    : DEFAULT_ACTIVE_DAYS;

  console.log(`Scanning ${config.projects.length} project(s) from projects.config.json\n`);

  const projects = [];
  for (const entry of config.projects) {
    if (!entry?.name || typeof entry.path !== 'string' || entry.path.trim() === '') {
      console.warn('  skipping config entry without a valid name/path:', JSON.stringify(entry));
      continue;
    }
    const result = await scanProject(entry, activeDays);
    projects.push(result);
    console.log(
      `  ${result.name}: ${result.status} (health ${result.summary.healthScore}) | ` +
        `docs ${result.stats.docsCount} | phases ${result.phases.length} | ` +
        `next ${result.nextTasks.length} | blockers ${result.blockers.length} | ` +
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

main().catch((err) => {
  console.error(`Scan failed: ${err.message}`);
  process.exit(1);
});
