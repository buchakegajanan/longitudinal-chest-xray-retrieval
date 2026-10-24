// =====================================================
// XRay Insight — Core Data Models / Interfaces
// =====================================================

export type ExaminationType = 'PA' | 'AP' | 'Lateral' | 'Unknown';
export type SimilarityLabel = 'High' | 'Moderate' | 'Low';
export type DatasetStatus = 'indexed' | 'pending' | 'error';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

/** Anonymized examination from the research dataset */
export interface Examination {
  id: string;
  caseId: string;
  sequenceIndex: number; // 1-based, when no date is available
  imageUrl: string;
  thumbnailUrl: string;
  viewType: ExaminationType;
  width?: number;
  height?: number;
  pixelSpacing?: string;
  findingLabels?: string;      // pipe-separated labels e.g. "Cardiomegaly|Effusion"
  findingLabelList?: string[]; // parsed array for template use
  imageAvailable?: boolean;
  availableDate?: string; // ISO date string — only when verified from dataset
  metadata: ExaminationMetadata;
}

export interface ExaminationMetadata {
  projectionLabel: string;
  followUpNumber: string; // e.g., "Follow-up 1 of 3"
  notes?: string;
  pixelSpacing?: string;
}

/** An anonymized research case (patient record from dataset) */
export interface ResearchCase {
  id: string;
  caseIdentifier: string; // e.g., "CXR-00042"
  examinations: Examination[];
  totalExaminations: number;
  indexedAt: string; // ISO date when indexed
  datasetSource: string;
  demographicsAvailable: boolean;
  patientAge?: number;
  patientGender?: string;
  conditionTags: string[]; // from dataset labels if available
  similarityScore?: number; // Only set when returned by real retrieval
  similarityLabel?: SimilarityLabel;
  isDemoSimilarity?: boolean; // Flag indicating demonstration data
}

/** Upload state for the analysis workspace */
export interface UploadedImage {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  validationStatus: 'valid' | 'invalid' | 'pending';
  validationMessage?: string;
}

/** Analysis session */
export interface AnalysisSession {
  id: string;
  createdAt: string;
  uploadedFileName?: string;
  status: 'pending' | 'completed' | 'demo';
  resultCount: number;
  topCaseId?: string;
}

/** Dataset record */
export interface DatasetRecord {
  id: string;
  caseIdentifier: string;
  status: DatasetStatus;
  imageCount: number;
  followUpCount: number;
  hasMetadata: boolean;
  hasLabels: boolean;
  conditionTags: string[];
  indexedAt?: string;
}

/** Dataset summary */
export interface DatasetSummary {
  name: string;
  description: string;
  totalCases: number;
  indexedCases: number;
  pendingCases: number;
  totalImages: number;
  lastUpdated: string;
  source: string;
  status: 'available' | 'partial' | 'not_indexed';
}

/** Comparison panel state */
export interface ComparisonState {
  leftExaminationId: string | null;
  rightExaminationId: string | null;
  zoomLevel: number;
  fitToScreen: boolean;
}

/** User settings */
export interface AppSettings {
  density: 'compact' | 'comfortable' | 'spacious';
  theme: 'light';
  sidebarCollapsed: boolean;
  showDemoIndicators: boolean;
}

/** Navigation item */
export interface NavItem {
  label: string;
  route: string;
  icon: string;
  badgeCount?: number;
}

/** Dashboard metric */
export interface DashboardMetric {
  label: string;
  value: string | number;
  unit?: string;
  description: string;
  trend?: 'up' | 'down' | 'neutral';
}
