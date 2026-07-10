import type { PhaseStatus, StepStatus } from '../types';

/**
 * Non-color lifecycle cues for the timeline: every status pairs its semantic
 * theme token with an icon glyph and a connector treatment, so color is never
 * the only differentiator.
 */

export type ConnectorStyle = 'solid' | 'dashed' | 'broken';

export interface LifecycleVisual {
  /** Compact non-color glyph shown inside the axis node / status chip. */
  icon: string;
  /** Axis node classes (background/border use semantic tokens). */
  node: string;
  /** Connector line style approaching this item. */
  connector: ConnectorStyle;
  /** Connector color class (border-color token). */
  connectorClass: string;
}

export const LIFECYCLE_VISUALS: Record<PhaseStatus | StepStatus, LifecycleVisual> = {
  closed: { icon: '✓', node: 'bg-ok border-ok text-void', connector: 'solid', connectorClass: 'border-ok/70' },
  accepted: { icon: '✓', node: 'bg-ok/80 border-ok text-void', connector: 'solid', connectorClass: 'border-ok/60' },
  in_progress: { icon: '●', node: 'bg-info border-info text-void', connector: 'solid', connectorClass: 'border-info/70' },
  pending_acceptance: { icon: '◆', node: 'bg-gate border-gate text-void', connector: 'solid', connectorClass: 'border-gate/70' },
  blocked: { icon: '!', node: 'bg-danger border-danger text-void', connector: 'solid', connectorClass: 'border-danger/70' },
  ready: { icon: '○', node: 'bg-transparent border-info text-info', connector: 'dashed', connectorClass: 'border-info/50' },
  planned: { icon: '○', node: 'bg-transparent border-line-strong text-mute', connector: 'dashed', connectorClass: 'border-line-strong' },
  draft: { icon: '◌', node: 'bg-transparent border-dim/60 text-dim', connector: 'dashed', connectorClass: 'border-dim/40' },
  deferred: { icon: '‖', node: 'bg-transparent border-warn text-warn', connector: 'dashed', connectorClass: 'border-warn/60' },
  cancelled: { icon: '✕', node: 'bg-transparent border-dim/50 text-dim', connector: 'broken', connectorClass: 'border-dim/40' },
  superseded: { icon: '↷', node: 'bg-transparent border-dim/50 text-dim', connector: 'broken', connectorClass: 'border-dim/40' },
};

/** True for lifecycle states rendered as resolved/muted history. */
export const RESOLVED_STATUSES = new Set<PhaseStatus>(['closed', 'accepted']);

/** True for lifecycle states rendered as de-emphasized removed history. */
export const REMOVED_STATUSES = new Set<PhaseStatus>(['cancelled', 'superseded']);
