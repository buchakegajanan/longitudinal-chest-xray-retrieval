// =====================================================
// XRay Insight — Centralized Mock Data Layer
// NOTE: All data here is simulated for demonstration.
// No real patient information is present.
// =====================================================

import {
  ResearchCase,
  Examination,
  AnalysisSession,
  DatasetRecord,
  DatasetSummary,
  DashboardMetric,
} from '../models/models';

// Placeholder chest X-ray images using identifiable demo placeholders
// In production these would reference actual anonymized dataset images
const PLACEHOLDER_IMAGES = {
  cxr01: 'https://placehold.co/512x512/1a202c/718096?text=CXR+Demo',
  cxr02: 'https://placehold.co/512x512/1a202c/718096?text=CXR+Demo',
  thumb: 'https://placehold.co/96x96/1a202c/718096?text=CXR',
};

// Generate placeholder thumbnail URLs with case identifiers for visual differentiation
function thumbUrl(caseId: string, seq: number): string {
  const shade = seq % 2 === 0 ? '1e293b' : '1a202c';
  return `https://placehold.co/120x120/${shade}/94a3b8?text=${encodeURIComponent(caseId + '-' + seq)}`;
}

function imgUrl(caseId: string, seq: number): string {
  return `https://placehold.co/512x512/0f172a/64748b?text=${encodeURIComponent(caseId + ' Exam ' + seq)}`;
}

// =====================================================
// Examinations
// =====================================================

export const MOCK_EXAMINATIONS: Record<string, Examination[]> = {
  'CXR-0042': [
    {
      id: 'exam-0042-1', caseId: 'CXR-0042', sequenceIndex: 1,
      imageUrl: imgUrl('CXR-0042', 1), thumbnailUrl: thumbUrl('CXR-0042', 1),
      viewType: 'PA', width: 1024, height: 1024,
      metadata: { projectionLabel: 'PA View', followUpNumber: 'Baseline (1 of 3)' }
    },
    {
      id: 'exam-0042-2', caseId: 'CXR-0042', sequenceIndex: 2,
      imageUrl: imgUrl('CXR-0042', 2), thumbnailUrl: thumbUrl('CXR-0042', 2),
      viewType: 'PA', width: 1024, height: 1024,
      metadata: { projectionLabel: 'PA View', followUpNumber: 'Follow-up 1 (2 of 3)' }
    },
    {
      id: 'exam-0042-3', caseId: 'CXR-0042', sequenceIndex: 3,
      imageUrl: imgUrl('CXR-0042', 3), thumbnailUrl: thumbUrl('CXR-0042', 3),
      viewType: 'PA', width: 1024, height: 1024,
      metadata: { projectionLabel: 'PA View', followUpNumber: 'Follow-up 2 (3 of 3)' }
    },
  ],
  'CXR-0117': [
    {
      id: 'exam-0117-1', caseId: 'CXR-0117', sequenceIndex: 1,
      imageUrl: imgUrl('CXR-0117', 1), thumbnailUrl: thumbUrl('CXR-0117', 1),
      viewType: 'AP', width: 1024, height: 1024,
      metadata: { projectionLabel: 'AP View', followUpNumber: 'Baseline (1 of 2)' }
    },
    {
      id: 'exam-0117-2', caseId: 'CXR-0117', sequenceIndex: 2,
      imageUrl: imgUrl('CXR-0117', 2), thumbnailUrl: thumbUrl('CXR-0117', 2),
      viewType: 'AP', width: 1024, height: 1024,
      metadata: { projectionLabel: 'AP View', followUpNumber: 'Follow-up 1 (2 of 2)' }
    },
  ],
  'CXR-0289': [
    {
      id: 'exam-0289-1', caseId: 'CXR-0289', sequenceIndex: 1,
      imageUrl: imgUrl('CXR-0289', 1), thumbnailUrl: thumbUrl('CXR-0289', 1),
      viewType: 'PA', width: 1024, height: 1024,
      metadata: { projectionLabel: 'PA View', followUpNumber: 'Baseline (1 of 4)' }
    },
    {
      id: 'exam-0289-2', caseId: 'CXR-0289', sequenceIndex: 2,
      imageUrl: imgUrl('CXR-0289', 2), thumbnailUrl: thumbUrl('CXR-0289', 2),
      viewType: 'PA', width: 1024, height: 1024,
      metadata: { projectionLabel: 'PA View', followUpNumber: 'Follow-up 1 (2 of 4)' }
    },
    {
      id: 'exam-0289-3', caseId: 'CXR-0289', sequenceIndex: 3,
      imageUrl: imgUrl('CXR-0289', 3), thumbnailUrl: thumbUrl('CXR-0289', 3),
      viewType: 'PA', width: 1024, height: 1024,
      metadata: { projectionLabel: 'PA View', followUpNumber: 'Follow-up 2 (3 of 4)' }
    },
    {
      id: 'exam-0289-4', caseId: 'CXR-0289', sequenceIndex: 4,
      imageUrl: imgUrl('CXR-0289', 4), thumbnailUrl: thumbUrl('CXR-0289', 4),
      viewType: 'PA', width: 1024, height: 1024,
      metadata: { projectionLabel: 'PA View', followUpNumber: 'Follow-up 3 (4 of 4)' }
    },
  ],
  'CXR-0358': [
    {
      id: 'exam-0358-1', caseId: 'CXR-0358', sequenceIndex: 1,
      imageUrl: imgUrl('CXR-0358', 1), thumbnailUrl: thumbUrl('CXR-0358', 1),
      viewType: 'Lateral', width: 1024, height: 1024,
      metadata: { projectionLabel: 'Lateral View', followUpNumber: 'Baseline (1 of 2)' }
    },
    {
      id: 'exam-0358-2', caseId: 'CXR-0358', sequenceIndex: 2,
      imageUrl: imgUrl('CXR-0358', 2), thumbnailUrl: thumbUrl('CXR-0358', 2),
      viewType: 'Lateral', width: 1024, height: 1024,
      metadata: { projectionLabel: 'Lateral View', followUpNumber: 'Follow-up 1 (2 of 2)' }
    },
  ],
  'CXR-0501': [
    {
      id: 'exam-0501-1', caseId: 'CXR-0501', sequenceIndex: 1,
      imageUrl: imgUrl('CXR-0501', 1), thumbnailUrl: thumbUrl('CXR-0501', 1),
      viewType: 'PA', width: 1024, height: 1024,
      metadata: { projectionLabel: 'PA View', followUpNumber: 'Baseline (1 of 3)' }
    },
    {
      id: 'exam-0501-2', caseId: 'CXR-0501', sequenceIndex: 2,
      imageUrl: imgUrl('CXR-0501', 2), thumbnailUrl: thumbUrl('CXR-0501', 2),
      viewType: 'PA', width: 1024, height: 1024,
      metadata: { projectionLabel: 'PA View', followUpNumber: 'Follow-up 1 (2 of 3)' }
    },
    {
      id: 'exam-0501-3', caseId: 'CXR-0501', sequenceIndex: 3,
      imageUrl: imgUrl('CXR-0501', 3), thumbnailUrl: thumbUrl('CXR-0501', 3),
      viewType: 'PA', width: 1024, height: 1024,
      metadata: { projectionLabel: 'PA View', followUpNumber: 'Follow-up 2 (3 of 3)' }
    },
  ],
  'CXR-0674': [
    {
      id: 'exam-0674-1', caseId: 'CXR-0674', sequenceIndex: 1,
      imageUrl: imgUrl('CXR-0674', 1), thumbnailUrl: thumbUrl('CXR-0674', 1),
      viewType: 'AP', width: 1024, height: 1024,
      metadata: { projectionLabel: 'AP View', followUpNumber: 'Baseline (1 of 2)' }
    },
    {
      id: 'exam-0674-2', caseId: 'CXR-0674', sequenceIndex: 2,
      imageUrl: imgUrl('CXR-0674', 2), thumbnailUrl: thumbUrl('CXR-0674', 2),
      viewType: 'AP', width: 1024, height: 1024,
      metadata: { projectionLabel: 'AP View', followUpNumber: 'Follow-up 1 (2 of 2)' }
    },
  ],
};

// =====================================================
// Research Cases
// =====================================================

export const MOCK_CASES: ResearchCase[] = [
  {
    id: 'case-0042',
    caseIdentifier: 'CXR-0042',
    examinations: MOCK_EXAMINATIONS['CXR-0042'],
    totalExaminations: 3,
    indexedAt: '2024-11-15T09:00:00Z',
    datasetSource: 'Sample Research Dataset',
    demographicsAvailable: false,
    conditionTags: ['Cardiomegaly', 'Effusion'],
    similarityScore: 0.91,
    similarityLabel: 'High',
    isDemoSimilarity: true,
  },
  {
    id: 'case-0117',
    caseIdentifier: 'CXR-0117',
    examinations: MOCK_EXAMINATIONS['CXR-0117'],
    totalExaminations: 2,
    indexedAt: '2024-11-15T09:05:00Z',
    datasetSource: 'Sample Research Dataset',
    demographicsAvailable: false,
    conditionTags: ['Infiltration', 'Atelectasis'],
    similarityScore: 0.84,
    similarityLabel: 'High',
    isDemoSimilarity: true,
  },
  {
    id: 'case-0289',
    caseIdentifier: 'CXR-0289',
    examinations: MOCK_EXAMINATIONS['CXR-0289'],
    totalExaminations: 4,
    indexedAt: '2024-11-16T10:20:00Z',
    datasetSource: 'Sample Research Dataset',
    demographicsAvailable: false,
    conditionTags: ['Pleural Thickening'],
    similarityScore: 0.77,
    similarityLabel: 'Moderate',
    isDemoSimilarity: true,
  },
  {
    id: 'case-0358',
    caseIdentifier: 'CXR-0358',
    examinations: MOCK_EXAMINATIONS['CXR-0358'],
    totalExaminations: 2,
    indexedAt: '2024-11-17T08:45:00Z',
    datasetSource: 'Sample Research Dataset',
    demographicsAvailable: false,
    conditionTags: ['Consolidation', 'Effusion'],
    similarityScore: 0.72,
    similarityLabel: 'Moderate',
    isDemoSimilarity: true,
  },
  {
    id: 'case-0501',
    caseIdentifier: 'CXR-0501',
    examinations: MOCK_EXAMINATIONS['CXR-0501'],
    totalExaminations: 3,
    indexedAt: '2024-11-18T14:30:00Z',
    datasetSource: 'Sample Research Dataset',
    demographicsAvailable: false,
    conditionTags: ['No Finding'],
    similarityScore: 0.65,
    similarityLabel: 'Moderate',
    isDemoSimilarity: true,
  },
  {
    id: 'case-0674',
    caseIdentifier: 'CXR-0674',
    examinations: MOCK_EXAMINATIONS['CXR-0674'],
    totalExaminations: 2,
    indexedAt: '2024-11-19T11:10:00Z',
    datasetSource: 'Sample Research Dataset',
    demographicsAvailable: false,
    conditionTags: ['Pneumothorax'],
    similarityScore: 0.58,
    similarityLabel: 'Low',
    isDemoSimilarity: true,
  },
];

// =====================================================
// Analysis Sessions
// =====================================================

export const MOCK_SESSIONS: AnalysisSession[] = [
  {
    id: 'session-001',
    createdAt: '2024-12-10T14:23:00Z',
    uploadedFileName: 'patient_xray_001.jpg',
    status: 'demo',
    resultCount: 6,
    topCaseId: 'CXR-0042',
  },
  {
    id: 'session-002',
    createdAt: '2024-12-09T10:11:00Z',
    uploadedFileName: 'chest_scan_PA.png',
    status: 'demo',
    resultCount: 5,
    topCaseId: 'CXR-0117',
  },
  {
    id: 'session-003',
    createdAt: '2024-12-08T16:45:00Z',
    uploadedFileName: 'xray_followup.jpg',
    status: 'demo',
    resultCount: 4,
    topCaseId: 'CXR-0289',
  },
];

// =====================================================
// Dataset Records
// =====================================================

export const MOCK_DATASET_RECORDS: DatasetRecord[] = [
  ...MOCK_CASES.map(c => ({
    id: c.id,
    caseIdentifier: c.caseIdentifier,
    status: 'indexed' as const,
    imageCount: c.totalExaminations,
    followUpCount: c.totalExaminations - 1,
    hasMetadata: true,
    hasLabels: c.conditionTags.length > 0,
    conditionTags: c.conditionTags,
    indexedAt: c.indexedAt,
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `case-pending-${i}`,
    caseIdentifier: `CXR-0${700 + i * 13}`,
    status: 'pending' as const,
    imageCount: 0,
    followUpCount: 0,
    hasMetadata: false,
    hasLabels: false,
    conditionTags: [],
  })),
];

// =====================================================
// Dataset Summary
// =====================================================

export const MOCK_DATASET_SUMMARY: DatasetSummary = {
  name: 'Sample Research Dataset',
  description: 'A curated collection of anonymized chest X-ray sequences for longitudinal disease progression research. This is demonstration data only.',
  totalCases: 14,
  indexedCases: 6,
  pendingCases: 8,
  totalImages: 16,
  lastUpdated: '2024-12-10T09:00:00Z',
  source: 'Research demonstration dataset',
  status: 'partial',
};

// =====================================================
// Dashboard Metrics
// =====================================================

export const MOCK_DASHBOARD_METRICS: DashboardMetric[] = [
  {
    label: 'Indexed Cases',
    value: 6,
    description: 'Anonymized research cases with embeddings',
    trend: 'neutral',
  },
  {
    label: 'Total Examinations',
    value: 16,
    description: 'Individual chest X-ray images available',
    trend: 'neutral',
  },
  {
    label: 'Cases with Follow-ups',
    value: 6,
    description: 'Cases with 2 or more examinations',
    trend: 'neutral',
  },
  {
    label: 'Analysis Sessions',
    value: 3,
    description: 'Demo analysis sessions completed',
    trend: 'neutral',
  },
];

// =====================================================
// Condition tags available for filtering
// =====================================================

export const ALL_CONDITION_TAGS = [
  'Cardiomegaly',
  'Effusion',
  'Infiltration',
  'Atelectasis',
  'Pleural Thickening',
  'Consolidation',
  'Pneumothorax',
  'No Finding',
];
