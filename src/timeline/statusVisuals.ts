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
  closed: { icon: '✓', node: 'bg-ok border-ok text-void', connector: 'solid', connectorClass: 'border-ok' },
  accepted: { icon: '✓', node: 'bg-ok border-ok text-void', connector: 'solid', connectorClass: 'border-ok' },
  in_progress: { icon: '●', node: 'bg-info border-info text-void', connector: 'solid', connectorClass: 'border-info' },
  pending_acceptance: { icon: '◆', node: 'bg-gate border-gate text-void', connector: 'solid', connectorClass: 'border-gate' },
  blocked: { icon: '!', node: 'bg-danger border-danger text-void', connector: 'solid', connectorClass: 'border-danger' },
  ready: { icon: '○', node: 'bg-transparent border-info text-info', connector: 'dashed', connectorClass: 'border-info' },
  planned: { icon: '○', node: 'bg-transparent border-mute text-mute', connector: 'dashed', connectorClass: 'border-mute' },
  draft: { icon: '◌', node: 'bg-transparent border-dim text-dim', connector: 'dashed', connectorClass: 'border-dim' },
  deferred: { icon: '‖', node: 'bg-transparent border-warn text-warn', connector: 'dashed', connectorClass: 'border-warn' },
  cancelled: { icon: '✕', node: 'bg-transparent border-dim text-dim', connector: 'broken', connectorClass: 'border-dim' },
  superseded: { icon: '↷', node: 'bg-transparent border-dim text-dim', connector: 'broken', connectorClass: 'border-dim' },
};

/** True for lifecycle states rendered as resolved/muted history. */
export const RESOLVED_STATUSES = new Set<PhaseStatus>(['closed', 'accepted']);

/** True for lifecycle states rendered as de-emphasized removed history. */
export const REMOVED_STATUSES = new Set<PhaseStatus>(['cancelled', 'superseded']);
