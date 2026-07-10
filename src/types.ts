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
  | 'draft'
  | 'planned'
  | 'ready'
  | 'in_progress'
  | 'blocked'
  | 'pending_acceptance'
  | 'accepted'
  | 'closed'
  | 'deferred'
  | 'cancelled'
  | 'superseded';

export type StepStatus =
  | 'draft'
  | 'planned'
  | 'ready'
  | 'in_progress'
  | 'blocked'
  | 'pending_acceptance'
  | 'accepted'
  | 'closed'
  | 'deferred'
  | 'cancelled'
  | 'superseded';

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

export type ProjectBriefReportMode = 'daily' | 'weekly';

export type ProjectBriefReportPriority = 'high' | 'medium' | 'low';

export type ProjectBriefReportSafeStateCode =
  | 'missing-generated-scan-data'
  | 'missing-previous-baseline'
  | 'missing-findings-store'
  | 'empty-findings'
  | 'no-attention-items';

export type ProjectBriefReportSafeStateSeverity = 'info' | 'warning' | 'error';

export type ProjectBriefReportAttentionReasonKind =
  | 'unresolved-finding'
  | 'blocker'
  | 'approval-gate'
  | 'needs-review'
  | 'changed-next-action'
  | 'changed-status'
  | 'changed-risk'
  | 'documentation-gap'
  | 'first-run-current-signal';

export type ProjectBriefReportAttentionReasonSource =
  | 'ai-finding'
  | 'ai-context'
  | 'scan-summary'
  | 'baseline';

export type ProjectBriefReportDerivedLabelReason =
  | 'derived-status'
  | 'derived-health-score'
  | 'derived-summary'
  | 'derived-recommendation'
  | 'missing-source-line';

export type ProjectBriefReportRecommendedDecisionKind =
  | 'review-findings'
  | 'resolve-blocker'
  | 'approve-or-reject-gate'
  | 'choose-next-action'
  | 'inspect-changes'
  | 'no-action-needed';

export type ProjectBriefReportChangedCategory =
  | 'status'
  | 'statusReason'
  | 'currentPhase'
  | 'nextAction'
  | 'blockerSummary'
  | 'riskSummary'
  | 'gaps'
  | 'findings';

export interface ProjectBriefReportGeneratedFrom {
  projectConfig: 'app-data/projects.config.json';
  scanData: 'app-data/projects.generated.json';
  aiContextChanges: 'derived' | 'unavailable';
  aiFindings: 'app-data/ai.findings.generated.json';
  remoteServicesUsed: false;
}

export interface ProjectBriefReportInputState {
  generatedScanAvailable: boolean;
  trackedProjectCount: number;
  previousBaselineAvailable: boolean;
  findingsAvailable: boolean;
  changesAvailable: boolean;
}

export interface ProjectBriefReportBaseline {
  kind: 'ai-context-snapshot';
  requestedSince: string | null;
  previousSnapshotAvailable: boolean;
  comparisonAvailable: boolean;
  message: string;
}

export interface ProjectBriefReportSafeState {
  code: ProjectBriefReportSafeStateCode;
  severity: ProjectBriefReportSafeStateSeverity;
  message: string;
  blocksReport: boolean;
}

export interface ProjectBriefReportSummary {
  projectCount: number;
  itemCount: number;
  highPriorityCount: number;
  unresolvedFindingCount: number;
  blockerCount: number;
  approvalGateCount: number;
  changedProjectCount: number;
  safeStateCount: number;
}

export interface ProjectBriefReportAttentionReason {
  kind: ProjectBriefReportAttentionReasonKind;
  label: string;
  severity: ProjectBriefReportPriority;
  source: ProjectBriefReportAttentionReasonSource;
}

export interface ProjectBriefReportFindingSummary {
  unresolvedCount: number;
  acceptedCount: number;
  dismissedCount: number;
  staleCount: number;
  unresolvedIds: string[];
  unresolved: Array<{
    id: string;
    type: AiFindingType;
    title: string;
    confidence: Confidence;
    evidence: AiEvidenceItem[];
  }>;
}

export interface ProjectBriefReportCurrentState {
  status: ProjectStatus;
  healthScore: number | null;
  currentPhase: string | null;
  nextAction: string | null;
  mainBlocker: string | null;
  mainRisk: string | null;
}

export interface ProjectBriefReportDerivedLabel {
  field: string;
  reason: ProjectBriefReportDerivedLabelReason;
  evidenceKind: 'derived-summary';
}

export interface ProjectBriefReportRecommendedHumanDecision {
  kind: ProjectBriefReportRecommendedDecisionKind;
  prompt: string;
  rationale: string;
  actionTaken: false;
  acceptedDecision: false;
}

export interface ProjectBriefReportItem {
  project: {
    id: string | null;
    name: string;
    path: string;
  };
  priority: ProjectBriefReportPriority;
  rank: number;
  attentionReasons: ProjectBriefReportAttentionReason[];
  changedCategories: ProjectBriefReportChangedCategory[];
  findingsSummary: ProjectBriefReportFindingSummary;
  blockers: AiContextItem[];
  currentState: ProjectBriefReportCurrentState;
  evidence: AiEvidenceItem[];
  derivedLabels: ProjectBriefReportDerivedLabel[];
  recommendedHumanDecision: ProjectBriefReportRecommendedHumanDecision;
}

export interface ProjectBriefReportWorkBoundaries {
  localOnly: true;
  derivedFromGeneratedScan: true;
  scannedProjectsReadOnly: true;
  noModelProviderRequired: true;
  reviewRequiredFindingsOnly: true;
  noAutomaticAction: true;
}

export interface ProjectBriefReport {
  kind: 'project-brief-report';
  schemaVersion: 1;
  generatedAt: string;
  mode: ProjectBriefReportMode;
  since: string | null;
  generatedFrom: ProjectBriefReportGeneratedFrom;
  inputState: ProjectBriefReportInputState;
  baseline: ProjectBriefReportBaseline;
  safeStates: ProjectBriefReportSafeState[];
  summary: ProjectBriefReportSummary;
  items: ProjectBriefReportItem[];
  noAttentionMessage: string | null;
  workBoundaries: ProjectBriefReportWorkBoundaries;
}

export type AgentPreflightAgentRole = 'implementation' | 'reviewer' | 'verification' | 'handoff';

export type AgentPreflightChangeStatus = 'proposed' | 'accepted' | 'archived' | 'unknown';

export type AgentPreflightAcceptanceSource =
  | 'accepted-spec'
  | 'proposed-change'
  | 'phase-plan'
  | 'audit'
  | 'checklist'
  | 'project-doc';

export type AgentPreflightAcceptanceStatus = 'accepted' | 'planned' | 'proposed' | 'advisory';

export type AgentPreflightAttentionSignalKind =
  | 'risk'
  | 'blocker'
  | 'approval-gate'
  | 'needs-review'
  | 'unresolved-finding'
  | 'documentation-gap'
  | 'missing-verification'
  | 'stale-doc';

export type AgentPreflightVerificationExpectationKind = 'command' | 'manual-check' | 'review' | 'doc-read';

export type AgentPreflightRequiredReadingKind =
  | 'project-rule'
  | 'project-doc'
  | 'phase-doc'
  | 'change-artifact'
  | 'checklist';

export type AgentPreflightReadingStatus = 'available' | 'missing' | 'proposed' | 'accepted' | 'archived' | 'unavailable';

export type AgentPreflightSafeStateCode =
  | 'missing-findings-store'
  | 'missing-openspec-state'
  | 'missing-phase-signals'
  | 'missing-audit-signals'
  | 'missing-checklist-signals'
  | 'unknown-change';

export type AgentPreflightSafeStateSeverity = 'info' | 'warning' | 'error';

export type AgentPreflightDerivedLabelReason =
  | 'derived-status'
  | 'derived-health-score'
  | 'derived-summary'
  | 'derived-recommendation'
  | 'missing-source-line';

export interface AgentPreflightEvidence {
  kind: AiEvidenceKind;
  file?: string;
  line?: number;
  text?: string | null;
}

export interface AgentPreflightProject {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  generatedScanName: string | null;
}

export interface AgentPreflightChange {
  id: string;
  status: AgentPreflightChangeStatus;
  requirementCount: number;
  scenarioCount: number;
  taskCount: number;
  openTaskCount: number;
  artifacts: string[];
}

export interface AgentPreflightGeneratedFrom {
  projectConfig: string;
  scanData: string;
  aiContext: 'derived' | 'unavailable';
  aiFindings: string;
  openspec: 'local-artifacts' | 'unavailable';
  projectDocs: 'local-docs' | 'unavailable';
  remoteServicesUsed: false;
}

export interface AgentPreflightInputState {
  generatedScanAvailable: boolean;
  trackedProjectAvailable: boolean;
  projectEnabled: boolean;
  aiContextAvailable: boolean;
  findingsAvailable: boolean;
  openspecAvailable: boolean;
  phaseDocsAvailable: boolean;
  auditDocsAvailable: boolean;
  checklistDocsAvailable: boolean;
}

export interface AgentPreflightSafeState {
  code: AgentPreflightSafeStateCode;
  severity: AgentPreflightSafeStateSeverity;
  message: string;
  blocksPacket: boolean;
}

export interface AgentPreflightRequiredReading {
  order: number;
  kind: AgentPreflightRequiredReadingKind;
  title: string;
  path: string;
  status: AgentPreflightReadingStatus;
  reason: string;
  evidence: AgentPreflightEvidence[];
}

export interface AgentPreflightProjectState {
  status: ProjectStatus | null;
  healthScore: number | null;
  currentPhase: string | null;
  nextAction: string | null;
  mainBlocker: string | null;
  mainRisk: string | null;
  recentDecision: string | null;
}

export interface AgentPreflightAcceptanceMapItem {
  source: AgentPreflightAcceptanceSource;
  id: string;
  title: string;
  status: AgentPreflightAcceptanceStatus;
  evidenceTarget: string;
  evidence: AgentPreflightEvidence[];
}

export interface AgentPreflightAttentionSignal {
  kind: AgentPreflightAttentionSignalKind;
  severity: ProjectBriefReportPriority;
  title: string;
  source: AgentPreflightAcceptanceSource;
  status: 'advisory' | 'warning' | 'blocked' | 'info';
  evidence: AgentPreflightEvidence[];
}

export interface AgentPreflightVerificationExpectation {
  kind: AgentPreflightVerificationExpectationKind;
  command?: string;
  reason: string;
  expectedEvidence: string;
  advisoryOnly: boolean;
}

export interface AgentPreflightDerivedLabel {
  field: string;
  reason: AgentPreflightDerivedLabelReason;
  evidenceKind: AiEvidenceKind;
}

export interface AgentPreflightWorkBoundaries {
  localOnly: true;
  derivedFromGeneratedScan: true;
  scannedProjectsReadOnly: true;
  noModelProviderRequired: true;
  reviewRequiredFindingsOnly: true;
  noAutomaticAction: true;
  noCommandsExecuted: true;
  noCommitsCreated: true;
  noTaskOrCalendarWrites: true;
  noRemoteCalls: true;
  proposedChangesAreNotAccepted: true;
}

export interface AgentPreflightPacket {
  kind: 'agent-preflight-packet';
  schemaVersion: 1;
  generatedAt: string;
  project: AgentPreflightProject;
  agentRole: AgentPreflightAgentRole;
  change: AgentPreflightChange | null;
  generatedFrom: AgentPreflightGeneratedFrom;
  inputState: AgentPreflightInputState;
  safeStates: AgentPreflightSafeState[];
  requiredReading: AgentPreflightRequiredReading[];
  projectState: AgentPreflightProjectState;
  acceptanceMap: AgentPreflightAcceptanceMapItem[];
  attentionSignals: AgentPreflightAttentionSignal[];
  verificationPlan: AgentPreflightVerificationExpectation[];
  workBoundaries: AgentPreflightWorkBoundaries;
  evidence: AgentPreflightEvidence[];
  derivedLabels: AgentPreflightDerivedLabel[];
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

/** Consolidated detail surfaces: Status, Work, Decisions, Knowledge. */
export type TabId = 'status' | 'work' | 'decisions' | 'knowledge';

/** Secondary view inside the Knowledge surface. */
export type KnowledgeViewId = 'specs' | 'audits' | 'docs' | 'activity';

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
