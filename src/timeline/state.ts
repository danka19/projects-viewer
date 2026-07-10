import type { ProjectTimelineModel, TimelinePhaseModel } from './model';

/**
 * Pure timeline interaction state.
 *
 * Expansion, focus, and detail-origin identity are presentation state only:
 * they never change lifecycle status, and they are scoped to one project +
 * model revision so state from another project cannot leak.
 */

export interface TimelineFocus {
  kind: 'phase' | 'step';
  key: string;
}

export interface TimelineViewState {
  projectId: string;
  revision: string;
  expandedPhaseKey: string | null;
  focused: TimelineFocus | null;
  /** Key of the phase/step button that opened details, for focus return. */
  detailOriginKey: string | null;
}

const RESOLVED = new Set(['closed', 'accepted']);
const FUTURE = new Set(['draft', 'planned', 'ready']);

export function initTimelineViewState(model: ProjectTimelineModel): TimelineViewState {
  const current = currentPhase(model);
  // The explicit current phase is expanded by default; a phase without steps
  // still expands and shows its no-steps state.
  return {
    projectId: model.projectId,
    revision: model.revision,
    expandedPhaseKey: current?.key ?? null,
    focused: current ? { kind: 'phase', key: current.key } : null,
    detailOriginKey: null,
  };
}

/**
 * Carry state across model refreshes: same project + revision keeps state,
 * a compatible refresh keeps surviving IDs, anything else re-initializes.
 */
export function reconcileTimelineViewState(
  state: TimelineViewState,
  model: ProjectTimelineModel,
): TimelineViewState {
  if (state.projectId !== model.projectId) return initTimelineViewState(model);
  if (state.revision === model.revision) return state;
  const phaseKeys = new Set(model.phases.map((ph) => ph.key));
  const stepKeys = new Set(model.phases.flatMap((ph) => ph.steps.map((s) => s.key)));
  const expandedSurvives = state.expandedPhaseKey !== null && phaseKeys.has(state.expandedPhaseKey);
  const focusSurvives =
    state.focused !== null &&
    (state.focused.kind === 'phase'
      ? phaseKeys.has(state.focused.key)
      : stepKeys.has(state.focused.key));
  if (!expandedSurvives && state.expandedPhaseKey !== null) return initTimelineViewState(model);
  return {
    ...state,
    revision: model.revision,
    expandedPhaseKey: expandedSurvives ? state.expandedPhaseKey : null,
    focused: focusSurvives ? state.focused : null,
    detailOriginKey: null,
  };
}

/** Exclusive, reversible expansion: activating the expanded phase collapses it. */
export function togglePhase(state: TimelineViewState, phaseKey: string): TimelineViewState {
  const expandedPhaseKey = state.expandedPhaseKey === phaseKey ? null : phaseKey;
  return { ...state, expandedPhaseKey, focused: { kind: 'phase', key: phaseKey } };
}

export function collapse(state: TimelineViewState): TimelineViewState {
  return { ...state, expandedPhaseKey: null };
}

export function focusItem(
  state: TimelineViewState,
  kind: TimelineFocus['kind'],
  key: string,
): TimelineViewState {
  return { ...state, focused: { kind, key } };
}

export function markDetailOrigin(state: TimelineViewState, key: string | null): TimelineViewState {
  return { ...state, detailOriginKey: key };
}

export function currentPhase(model: ProjectTimelineModel): TimelinePhaseModel | null {
  if (!model.currentPhaseId) return null;
  return model.phases.find((ph) => ph.key === model.currentPhaseId) ?? null;
}

/**
 * When no explicit current phase exists, the viewport centers the transition
 * between the last resolved phase and the first eligible future phase.
 */
export function betweenPhasesAnchor(model: ProjectTimelineModel): {
  lastResolvedKey: string | null;
  firstFutureKey: string | null;
} {
  let lastResolvedKey: string | null = null;
  let firstFutureKey: string | null = null;
  for (const ph of model.phases) {
    if (RESOLVED.has(ph.status)) lastResolvedKey = ph.key;
    if (firstFutureKey === null && FUTURE.has(ph.status)) firstFutureKey = ph.key;
  }
  return { lastResolvedKey, firstFutureKey };
}
