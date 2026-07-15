import type { RawSpecWorkItem, RawSpecWorkModel, SpecIntegrityIssue } from '../types';

export interface TimelineOwnershipPhaseRef {
  id: string;
  sequence: number;
  steps: Array<{ id: string | null }>;
}

export interface TimelineSpecOwnership {
  stepSpecs: Record<string, RawSpecWorkItem[]>;
  phaseSpecs: RawSpecWorkItem[];
  unassignedSpecs: RawSpecWorkItem[];
  issues: SpecIntegrityIssue[];
}

function normalizePhaseId(value: string): string {
  const match = String(value).match(/^P?(\d+)$/i);
  return match ? `P${Number(match[1])}` : value;
}

export function buildTimelineSpecOwnership(
  phase: TimelineOwnershipPhaseRef,
  specWork: RawSpecWorkModel | undefined,
): TimelineSpecOwnership {
  const phaseId = normalizePhaseId(phase.id);
  const stepIds = new Set(phase.steps.map((step) => step.id).filter((id): id is string => Boolean(id)));
  const stepSpecs: Record<string, RawSpecWorkItem[]> = {};
  for (const stepId of stepIds) stepSpecs[stepId] = [];
  const phaseSpecs: RawSpecWorkItem[] = [];
  const unassignedSpecs: RawSpecWorkItem[] = [];
  const issues: SpecIntegrityIssue[] = [];

  for (const item of specWork?.specifications ?? []) {
    if (!item.roadmapPhaseId) {
      if (phase.sequence === 0) unassignedSpecs.push(item);
      continue;
    }
    if (normalizePhaseId(item.roadmapPhaseId) !== phaseId) continue;
    if (item.roadmapStepId && stepIds.has(item.roadmapStepId)) {
      stepSpecs[item.roadmapStepId].push(item);
      continue;
    }
    if (item.roadmapStepId) {
      if (phase.sequence === 0) unassignedSpecs.push(item);
      issues.push({ kind: 'invalid-ownership', message: `${item.id}: unknown roadmap step ${item.roadmapStepId} in ${phaseId}.`, source: item.source });
      continue;
    }
    phaseSpecs.push(item);
  }

  return { stepSpecs, phaseSpecs, unassignedSpecs, issues };
}
