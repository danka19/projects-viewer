import type { Confidence, PhaseItem, PhaseStatus, PhaseStep, ProjectData, StepStatus } from '../types';
import { phaseProgressInfo, projectRoadmapProgress } from '../phaseProgress';
import type { PhaseProgressInfo, RoadmapProgress } from '../phaseProgress';
import { buildTimelineSpecOwnership } from './specOwnership';
import type { RawSpecWorkItem } from '../types';

/**
 * Timeline presentation model.
 *
 * The timeline component renders this model verbatim: explicit current IDs,
 * stable keys, deterministic order, precomputed progress, and integrity
 * issues. It never scans prose and never infers a current phase or step —
 * ambiguity stays null and is reported as an integrity issue.
 */

export type TimelineSourceMode = 'live' | 'static' | 'stale';

export interface TimelineSourceRef {
  file: string;
  line: number;
}

export type TimelineIntegrityKind =
  | 'multiple-current-phases'
  | 'multiple-current-steps'
  | 'duplicate-phase-key'
  | 'duplicate-step-key'
  | 'phase-status-issue'
  | 'spec-ownership'
  | 'partial-data';

export interface TimelineIntegrityIssue {
  kind: TimelineIntegrityKind;
  message: string;
  phaseKey?: string;
  source?: TimelineSourceRef;
}

export interface TimelineStepModel {
  key: string;
  id: string | null;
  sequence: number;
  name: string;
  status: StepStatus;
  evidence: string;
  source: TimelineSourceRef;
  raw: PhaseStep;
  specs: RawSpecWorkItem[];
}

export interface TimelinePhaseModel {
  key: string;
  id: string;
  sequence: number;
  name: string;
  status: PhaseStatus;
  statusText: string;
  rule: string;
  confidence: Confidence;
  issue: PhaseItem['issue'];
  issueNote: string | null;
  progress: Pick<PhaseProgressInfo, 'percent' | 'basis'>;
  currentStepId: string | null;
  steps: TimelineStepModel[];
  phaseSpecs: RawSpecWorkItem[];
  unassignedSpecs: RawSpecWorkItem[];
  source: TimelineSourceRef;
  raw: PhaseItem;
}

export interface ProjectTimelineModel {
  projectId: string;
  revision: string;
  generatedAt: string;
  sourceMode: TimelineSourceMode;
  currentPhaseId: string | null;
  phases: TimelinePhaseModel[];
  progress: RoadmapProgress;
  integrityIssues: TimelineIntegrityIssue[];
  isPartial: boolean;
}

// Mirror of the scanner output limits (LIMITS in scan-projects.mjs). Reaching
// them means upstream truncation and the model must disclose partial data.
const SCANNER_PHASE_LIMIT = 100;
const SCANNER_STEPS_PER_PHASE_LIMIT = 60;

interface BuildOptions {
  generatedAt: string;
  sourceMode: TimelineSourceMode;
}

export function buildProjectTimelineModel(
  project: Pick<ProjectData, 'path' | 'phases' | 'error' | 'specWork'>,
  options: BuildOptions,
): ProjectTimelineModel {
  const issues: TimelineIntegrityIssue[] = [];
  const phaseKeys = new Set<string>();

  const phases: TimelinePhaseModel[] = project.phases.map((ph, index) => {
    let key = `phase:${ph.id}@${ph.file}:${ph.line}`;
    if (phaseKeys.has(key)) {
      issues.push({
        kind: 'duplicate-phase-key',
        message: `Phase "${ph.id}" appears more than once at ${ph.file}:${ph.line}.`,
        source: { file: ph.file, line: ph.line },
      });
      let n = 2;
      while (phaseKeys.has(`${key}#${n}`)) n += 1;
      key = `${key}#${n}`;
    }
    phaseKeys.add(key);

    const stepKeys = new Set<string>();
    const steps: TimelineStepModel[] = ph.steps.map((s, stepIndex) => {
      let stepKey = `step:${key}:${s.id ?? `${s.file}:${s.line}`}`;
      if (stepKeys.has(stepKey)) {
        issues.push({
          kind: 'duplicate-step-key',
          message: `Step "${s.id ?? s.name}" appears more than once in phase ${ph.id}.`,
          phaseKey: key,
          source: { file: s.file, line: s.line },
        });
        let n = 2;
        while (stepKeys.has(`${stepKey}#${n}`)) n += 1;
        stepKey = `${stepKey}#${n}`;
      }
      stepKeys.add(stepKey);
      return {
        key: stepKey,
        id: s.id,
        sequence: stepIndex,
        name: s.name,
        status: s.status,
        evidence: s.evidence,
        source: { file: s.file, line: s.line },
        raw: s,
        specs: [],
      };
    });

    const inProgressSteps = steps.filter((s) => s.status === 'in_progress');
    let currentStepId: string | null = null;
    if (inProgressSteps.length === 1) {
      currentStepId = inProgressSteps[0].key;
    } else if (inProgressSteps.length > 1) {
      issues.push({
        kind: 'multiple-current-steps',
        message: `Phase ${ph.id} documents ${inProgressSteps.length} steps as in progress; the current step is ambiguous.`,
        phaseKey: key,
        source: { file: ph.file, line: ph.line },
      });
    }

    if (ph.issue !== 'none') {
      issues.push({
        kind: 'phase-status-issue',
        message: `Phase ${ph.id}: ${ph.issueNote ?? `suspected ${ph.issue} issue`}`,
        phaseKey: key,
        source: { file: ph.file, line: ph.line },
      });
    }

    const info = phaseProgressInfo(ph);
    const ownership = buildTimelineSpecOwnership(
      { id: ph.id, sequence: index, steps: steps.map((step) => ({ id: step.id })) },
      project.specWork,
    );
    for (const issue of ownership.issues) {
      issues.push({
        kind: 'spec-ownership',
        message: issue.message,
        phaseKey: key,
        source: issue.source?.line == null ? undefined : { file: issue.source.file, line: issue.source.line },
      });
    }
    return {
      key,
      id: ph.id,
      sequence: index,
      name: ph.name,
      status: ph.status,
      statusText: ph.statusText,
      rule: ph.rule,
      confidence: ph.confidence,
      issue: ph.issue,
      issueNote: ph.issueNote,
      progress: { percent: info.percent, basis: info.basis },
      currentStepId,
      steps: steps.map((step) => ({
        ...step,
        specs: step.id ? ownership.stepSpecs[step.id] ?? [] : [],
      })),
      phaseSpecs: ownership.phaseSpecs,
      unassignedSpecs: ownership.unassignedSpecs,
      source: { file: ph.file, line: ph.line },
      raw: ph,
    };
  });

  const inProgressPhases = phases.filter((ph) => ph.status === 'in_progress');
  let currentPhaseId: string | null = null;
  if (inProgressPhases.length === 1) {
    currentPhaseId = inProgressPhases[0].key;
  } else if (inProgressPhases.length > 1) {
    issues.push({
      kind: 'multiple-current-phases',
      message: `${inProgressPhases.length} phases are documented as in progress (${inProgressPhases
        .map((ph) => ph.id)
        .join(', ')}); the current phase is ambiguous.`,
    });
  }

  const isPartial =
    project.error != null ||
    project.phases.length >= SCANNER_PHASE_LIMIT ||
    project.phases.some((ph) => ph.steps.length >= SCANNER_STEPS_PER_PHASE_LIMIT);
  if (isPartial) {
    issues.push({
      kind: 'partial-data',
      message:
        project.error ??
        'The scanner truncated phases or steps at its documented limits; this timeline is incomplete.',
    });
  }

  const revision = hashRevision(phases, currentPhaseId);

  return {
    projectId: project.path,
    revision,
    generatedAt: options.generatedAt,
    sourceMode: options.sourceMode,
    currentPhaseId,
    phases,
    progress: projectRoadmapProgress(project.phases),
    integrityIssues: issues,
    isPartial,
  };
}

/** djb2 hash over ordered identity + lifecycle so restored UI state can be scoped. */
function hashRevision(phases: TimelinePhaseModel[], currentPhaseId: string | null): string {
  const parts: string[] = [currentPhaseId ?? ''];
  for (const ph of phases) {
    parts.push(ph.key, ph.status, ph.currentStepId ?? '');
    for (const s of ph.steps) {
      parts.push(s.key, s.status, ...s.specs.map((spec) => spec.key));
    }
    parts.push(...ph.phaseSpecs.map((spec) => spec.key), ...ph.unassignedSpecs.map((spec) => spec.key));
  }
  const text = parts.join('|');
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return `r${(hash >>> 0).toString(36)}`;
}
