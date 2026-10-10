export type DashboardTone = "green" | "amber" | "red";
export type DashboardView = "overview" | "scan" | "patches" | "conflicts" | "verification" | "releases" | "incidents" | "audit" | "reviews";

export interface DashboardSite {
  id: string;
  name: string;
  repository: string;
  environment: string;
  releaseVersion: string;
  releaseTitle: string;
  owner: string;
}

export interface DashboardStage {
  stage: "scan" | "fix" | "ship";
  label: string;
  tone: DashboardTone;
  score: number;
  headline: string;
  explanation: string;
  href: string;
  counts: Readonly<Record<string, number>>;
}

export interface DashboardAction {
  id: string;
  stage: "scan" | "fix" | "ship";
  tone: DashboardTone;
  label: string;
  explanation: string;
  href: string;
  priority: number;
}

export interface DashboardRisk {
  tone: DashboardTone;
  score: number;
  label: string;
  explanation: string;
  factors: readonly string[];
}

export interface DashboardFinding {
  id: string;
  summary: string;
  explanation: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  blastRadius: { elementCount: number; pageCount: number; explanation: string };
}

export interface DashboardPatch {
  id: string;
  title: string;
  description: string;
  status: string;
  revision: number;
  operationCount: number;
  reviewerCount: number;
  tags: readonly string[];
  updatedAt: string;
  author: { name: string; initials: string };
}

export interface DashboardActivity {
  id: string;
  timestamp: string;
  type: "audit" | "finding" | "scan" | "review" | "health";
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
  subjectId: string;
}

export interface DashboardRelease {
  id: string;
  version: string;
  title: string;
  status: string;
  environment: string;
  createdAt: string;
  publishedAt: string | null;
  rolledBackAt: string | null;
  rollout: { canaryPercent: number; paused: boolean; killSwitch: { enabled: boolean } } | null;
}

export interface WorkspaceReadModel {
  generatedAt: string;
  site: { id: string; name: string; repository: string; owner: { name: string; initials: string } };
  stages: { scan: DashboardStage; fix: DashboardStage; ship: DashboardStage };
  nextAction: DashboardAction;
  actions: readonly DashboardAction[];
  risk: DashboardRisk;
  release: DashboardRelease | null;
  recentActivity: readonly DashboardActivity[];
  findings: readonly DashboardFinding[];
  patches: readonly DashboardPatch[];
  policy: { status: string; nextAction: string } | null;
}

export interface DashboardData {
  site: DashboardSite;
  workspace: WorkspaceReadModel;
  updatedAt: string;
  source: "api" | "seed";
}

export interface ToastMessage {
  id: string;
  tone: DashboardTone;
  title: string;
  detail: string;
}

export interface DashboardRoute {
  id: DashboardView;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
}
