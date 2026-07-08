export type ProjectStatus =
  | 'active'
  | 'stalled'
  | 'done'
  | 'pending-approval'
  | 'needs-review'
  | 'paused'
  | 'needs-attention'
  | 'unknown';

export type PhaseStatus =
  | 'planned'
  | 'in_progress'
  | 'paused'
  | 'blocked'
  | 'completed'
  | 'completed_pending_approval'
  | 'pending_approval'
  | 'needs_review'
  | 'unknown';

export type StepStatus =
  | 'completed'
  | 'completed_pending_approval'
  | 'in_progress'
  | 'pending'
  | 'blocked'
  | 'paused'
  | 'needs_review'
  | 'unknown';

export type Confidence = 'high' | 'medium' | 'low';

export interface PhaseStep {
  phaseId: string;
  id: string | null;
  name: string;
  status: StepStatus;
  rule: string;
  evidence: string;
  file: string;
  line: number;
}

export type DocCategory =
  | 'core'
  | 'roadmap'
  | 'spec'
  | 'audit'
  | 'decision'
  | 'handoff'
  | 'other';

export interface TaskItem {
  text: string;
  file: string;
  line: number;
  section: string | null;
}

export interface Marker {
  type: string; // TODO | FIXME | BUG | NEXT | DONE
  text: string;
  file: string;
  line: number;
}

export interface HeadingItem {
  text: string;
  level: number;
  file: string;
  line: number;
}

export interface PhaseItem {
  id: string;
  name: string;
  statusText: string;
  status: PhaseStatus;
  rule: string;
  confidence: Confidence;
  issue: 'none' | 'documentation' | 'parser';
  issueNote: string | null;
  branch: string | null;
  steps: PhaseStep[];
  file: string;
  line: number;
}

export interface DecisionItem {
  date: string | null;
  text: string;
  file: string;
  line: number;
}

export interface BlockerItem {
  group?: 'realBlockers' | 'approvalGates' | 'needsReview' | 'pausedDeferred';
  kind: 'rejection' | 'blocked' | 'approval-gate' | 'needs-review' | 'paused-deferred';
  severe: boolean;
  text: string;
  file: string;
  line: number;
}

export type BlockedGatedClassification =
  | 'project_signal'
  | 'agent_rule'
  | 'process_policy'
  | 'example_or_template';

export interface BlockedGatedCandidate {
  text: string;
  file: string;
  line: number;
  classification: BlockedGatedClassification;
  includedInProjectStatus: boolean;
  confidence: Confidence;
  reason: string;
  matchedKeywords: string[];
  nearbyContext: string;
}

export interface SignalGroups {
  realBlockers: BlockerItem[];
  approvalGates: BlockerItem[];
  needsReview: BlockerItem[];
  pausedDeferred: BlockerItem[];
}

export interface BlockedGatedDiagnostics {
  includedProjectSignals: BlockedGatedCandidate[];
  filteredAgentRules: BlockedGatedCandidate[];
  filteredProcessPolicies: BlockedGatedCandidate[];
  filteredExamplesOrTemplates: BlockedGatedCandidate[];
  summary: {
    oldRawCandidateCount: number;
    includedProjectSignalCount: number;
    filteredOutCount: number;
    filteredAgentRuleCount: number;
    filteredProcessPolicyCount: number;
    filteredExampleOrTemplateCount: number;
  };
}

export interface RiskItem {
  kind: 'risk' | 'open-question';
  text: string;
  file: string;
  line: number;
}

export interface SpecItem {
  kind: 'openspec' | 'handoff';
  name: string;
  file: string;
  status: string; // active | done | archived | unknown | raw text
  artifacts?: string[];
  openTasks?: number;
  completedTasks?: number;
}

export interface AuditDoc {
  file: string;
  title: string;
  date: string;
  status: 'attention' | 'recorded' | 'archived';
  severeSignals: number;
}

export interface DocsCoverage {
  readme: boolean;
  claude: boolean;
  roadmap: boolean;
  sddOrSpecs: boolean;
  audits: boolean;
}

export interface ProjectSummary {
  status: ProjectStatus;
  healthScore: number;
  currentPhase: string | null;
  nextAction: string | null;
  mainBlocker: string | null;
  mainRisk: string | null;
  recentDecision: string | null;
  recentChange: string | null;
  docsCoverage: DocsCoverage;
}

export interface DocIntel {
  readmeFound: boolean;
  roadmapFound: boolean;
  claudeFound: boolean;
  specsFound: boolean;
  openTaskCount: number;
  completedTaskCount: number;
  attentionMarkerCount: number;
  lastDocUpdate: string | null;
}

export interface DocFile {
  file: string;
  category: DocCategory;
  sizeBytes: number;
  modified: string;
  openTaskCount?: number;
  completedTaskCount?: number;
}

export interface ProjectStats {
  docsCount: number;
  totalSizeBytes: number;
  openTaskCount: number;
  completedTaskCount: number;
  nextTaskCount: number;
  markerCounts: Record<string, number>;
  completionPercent: number | null;
}

export interface ProjectData {
  name: string;
  path: string;
  status: ProjectStatus;
  statusReason: string;
  lastModified: string | null;
  error: string | null;
  summary: ProjectSummary;
  openTasks: TaskItem[];
  completedTasks: TaskItem[];
  nextTasks: TaskItem[];
  markers: Marker[];
  headings: HeadingItem[];
  phases: PhaseItem[];
  decisions: DecisionItem[];
  blockers: BlockerItem[];
  signalGroups: SignalGroups;
  blockedGatedDiagnostics: BlockedGatedDiagnostics;
  risks: RiskItem[];
  specs: SpecItem[];
  specFileCount: number;
  audits: AuditDoc[];
  gaps: string[];
  intel: DocIntel;
  docs: DocFile[];
  stats: ProjectStats;
}

export interface ScanOutput {
  generatedAt: string;
  activeDays: number;
  projects: ProjectData[];
}

export type AiEvidenceKind = 'source' | 'derived-summary';

export interface AiEvidenceItem {
  kind: AiEvidenceKind;
  file?: string;
  line?: number;
  text?: string | null;
}

export type AiFindingReviewState = 'new' | 'accepted' | 'dismissed' | 'stale';

export type AiFindingType =
  | 'status-contradiction'
  | 'stale-audit'
  | 'stale-handoff-pointer'
  | 'unresolved-human-gate'
  | 'unclear-next-action'
  | 'missing-specs'
  | 'missing-verification-evidence';

export interface AiContextItem {
  text: string;
  evidence: AiEvidenceItem[];
}

export interface AiContextListItem extends AiContextItem {
  category: 'constraint' | 'risk' | 'decision' | 'spec' | 'audit';
  kind?: string | null;
  confidence?: Confidence | null;
  status?: string;
  name?: string;
  title?: string;
  date?: string | null;
  openTasks?: number | null;
  completedTasks?: number | null;
  severeSignals?: number;
}

export interface AiProjectContext {
  kind: 'project-ai-context';
  identity: {
    id: string | null;
    name: string;
    path: string;
  };
  generatedFrom: 'projects.generated.json';
  status: ProjectStatus;
  statusReason: string;
  healthScore: number | null;
  lastModified: string | null;
  currentPhase: AiContextItem | null;
  nextAction: AiContextItem | null;
  mainBlocker: AiContextItem | null;
  mainRisk: AiContextItem | null;
  recentDecision: AiContextItem | null;
  gaps: AiContextItem[];
  constraints: {
    realBlockers: AiContextListItem[];
    approvalGates: AiContextListItem[];
    needsReview: AiContextListItem[];
    pausedDeferred: AiContextListItem[];
  };
  risks: AiContextListItem[];
  decisions: AiContextListItem[];
  specs: AiContextListItem[];
  audits: AiContextListItem[];
  findings: {
    unresolvedCount: number;
    acceptedCount: number;
    dismissedCount: number;
    staleCount: number;
    ids: string[];
  };
  workBoundaries: {
    localOnly: true;
    derivedFromGeneratedScan: true;
    scannedProjectsReadOnly: true;
    noModelProviderRequired: true;
    reviewRequiredFindingsOnly: true;
  };
}

export interface AllProjectsAiContext {
  kind: 'all-project-ai-context';
  generatedAt: string;
  activeDays: number;
  projectCount: number;
  projects: AiProjectContext[];
}

export interface AiContextChanges {
  kind: 'ai-context-changes';
  generatedAt: string;
  since: string;
  hasChanges: boolean;
  message: string;
  projects: {
    project: { name: string; path: string };
    lastModified: string | null;
    changedCategories: Array<
      | 'status'
      | 'statusReason'
      | 'currentPhase'
      | 'nextAction'
      | 'blockerSummary'
      | 'riskSummary'
      | 'gaps'
      | 'findings'
    >;
  }[];
}

export interface AiFinding {
  id: string;
  type: AiFindingType;
  title: string;
  explanation: string;
  confidence: Confidence;
  reviewState: AiFindingReviewState;
  reviewRequired: true;
  project: {
    name: string;
    path: string;
  };
  evidence: AiEvidenceItem[];
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  staleAt?: string;
}

export interface TrackedProjectConfig {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceConfig {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  discoveryDepth: 1 | 2 | 3;
  allowNestedProjects: boolean;
}

export interface ProjectConfigSettings {
  watchDocs: boolean;
  autoRescanIntervalSec: number;
  activeDays?: number;
}

export interface ProjectConfig {
  workspaces: WorkspaceConfig[];
  projects: TrackedProjectConfig[];
  settings: ProjectConfigSettings;
}

export interface DiscoveredProjectCandidate {
  name: string;
  path: string;
  reasons: string[];
  confidence: 'high' | 'medium' | 'low';
  badges: string[];
  isNested?: boolean;
}

export interface SkippedInternalFolder {
  path: string;
  reason: string;
}

export type TabId =
  | 'overview'
  | 'roadmap'
  | 'specs'
  | 'tasks'
  | 'decisions'
  | 'audits'
  | 'docs'
  | 'activity';

/** Item shown in the right-side detail drawer. */
export interface DrawerItem {
  type: string;
  title: string;
  status?: string;
  statusChip?: string;
  text?: string;
  file: string;
  line?: number;
  projectPath: string;
  related?: { label: string; item: DrawerItem }[];
}
