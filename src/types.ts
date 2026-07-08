export type ProjectStatus =
  | 'active'
  | 'stalled'
  | 'done'
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
  kind: 'rejection' | 'blocked' | 'human-gate';
  severe: boolean;
  text: string;
  file: string;
  line: number;
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
