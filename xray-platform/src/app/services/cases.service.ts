import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, catchError, map, tap, throwError, timer, switchMap, takeWhile } from 'rxjs';
import { ResearchCase, AnalysisSession, Examination } from '../models/models';
import { MOCK_SESSIONS } from '../data/mock-data';
import { environment } from '../../environments/environment';

// ─── shape returned by the real API ───────────────────────────────────────────
interface ApiExamination {
  id: string;
  caseId: string;
  sequenceIndex: number;
  imageIndex: string;
  imageUrl: string;
  thumbnailUrl: string;
  viewType: string;
  width?: number;
  height?: number;
  pixelSpacing?: string;
  findingLabels: string;
  followUpLabel: string;
  imageAvailable: boolean;
}

interface ApiResearchCase {
  id: string;
  caseIdentifier: string;
  datasetSource: string;
  totalExaminations: number;
  conditionTags: string[];
  findingLabels: string[];
  demographicsAvailable: boolean;
  patientAge?: number;
  patientGender?: string;
  isDemoSimilarity: boolean;
  similarityScore?: number;
  similarityLabel?: string;
  examinations: ApiExamination[];
}

interface PagedResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: ApiResearchCase[];
}

export interface CasesPage {
  cases: ResearchCase[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VisualSearchStatus {
  state: 'loading' | 'ready' | 'offline';
  progressText: string;
}

export interface PendingSimilarCaseResults {
  cases: ResearchCase[];
  method: string;
  queryImagePreview: string;
}

// Map API shapes to Angular model shapes
function mapExamination(e: ApiExamination): Examination {
  const labelList = e.findingLabels
    ? e.findingLabels.split('|').map(l => l.trim()).filter(l => l.length > 0)
    : [];
  return {
    id: e.id,
    caseId: e.caseId,
    sequenceIndex: e.sequenceIndex,
    imageUrl: `${environment.apiBaseUrl}${e.imageUrl}`,
    thumbnailUrl: `${environment.apiBaseUrl}${e.thumbnailUrl}`,
    viewType: (e.viewType as Examination['viewType']) ?? 'Unknown',
    width: e.width,
    height: e.height,
    pixelSpacing: e.pixelSpacing,
    findingLabels: e.findingLabels,
    findingLabelList: labelList,
    imageAvailable: e.imageAvailable,
    metadata: {
      projectionLabel: `${e.viewType} View`,
      followUpNumber: e.followUpLabel,
      notes: e.pixelSpacing ? `Pixel spacing: ${e.pixelSpacing}` : undefined,
      pixelSpacing: e.pixelSpacing
    }
  };
}

function mapCase(c: ApiResearchCase): ResearchCase {
  return {
    id: c.id,
    caseIdentifier: c.caseIdentifier,
    examinations: (c.examinations ?? []).map(mapExamination),
    totalExaminations: c.totalExaminations,
    indexedAt: new Date().toISOString(),
    datasetSource: c.datasetSource,
    demographicsAvailable: c.demographicsAvailable,
    patientAge: c.patientAge,
    patientGender: c.patientGender,
    conditionTags: c.conditionTags,
    similarityScore: c.similarityScore,
    similarityLabel: c.similarityLabel as ResearchCase['similarityLabel'],
    isDemoSimilarity: c.isDemoSimilarity
  };
}

/**
 * Cases Service — reads research case data from the ASP.NET API.
 * Falls back to an empty list if the API is unreachable.
 */
@Injectable({ providedIn: 'root' })
export class CasesService {
  private readonly http = inject(HttpClient);
  private _recentSessions = signal<AnalysisSession[]>([...MOCK_SESSIONS]);
  readonly recentSessions = this._recentSessions.asReadonly();

  /** Holds the most recent upload-analysis results so similar-cases page can show them */
  private _pendingResults = signal<PendingSimilarCaseResults | null>(null);
  private _latestQueryImagePreview = signal<string | null>(null);
  readonly latestQueryImagePreview = this._latestQueryImagePreview.asReadonly();

  /** Store results from an analysis run */
  setPendingResults(cases: ResearchCase[], method: string, queryImagePreview: string): void {
    this._latestQueryImagePreview.set(queryImagePreview);
    this._pendingResults.set({ cases, method, queryImagePreview });
  }

  /** Read and clear pending results (consume-once pattern) */
  takePendingResults(): PendingSimilarCaseResults | null {
    const r = this._pendingResults();
    this._pendingResults.set(null);
    return r;
  }

  getVisualSearchStatus(): Observable<VisualSearchStatus> {
    return timer(0, 5000).pipe(
      switchMap(() => this.http.get<{ status?: string; indexedImages?: number; message?: string }>(`${environment.apiBaseUrl}/api/visual-search/status`).pipe(
        map(response => ({
          state: response.status === 'ready' ? 'ready' as const : response.status === 'loading' ? 'loading' as const : 'offline' as const,
          progressText: response.message ?? (response.status === 'loading' && response.indexedImages !== undefined
            ? `Indexed ${response.indexedImages} images; building the remaining model index.`
            : 'Visual-search service is unavailable.')
        })),
        catchError(() => of({ state: 'offline' as const, progressText: 'Visual-search service is unavailable.' }))
      )),
      takeWhile(status => status.state !== 'ready', true)
    );
  }

  /** Retrieve paginated cases — used by timelines component */
  getCasesPage(page: number = 1, pageSize: number = 200): Observable<CasesPage> {
    return this.http.get<PagedResponse>(
      `${environment.apiBaseUrl}/api/research-cases?page=${page}&pageSize=${pageSize}`
    ).pipe(
      map(r => ({
        cases: r.items.map(mapCase),
        total: r.total,
        page: r.page,
        pageSize: r.pageSize,
        totalPages: r.totalPages
      })),
      catchError(() => {
        console.warn('[CasesService] getCasesPage failed — returning empty page.');
        return of({ cases: [], total: 0, page, pageSize, totalPages: 0 });
      })
    );
  }

  /** Retrieve all indexed research cases (pageSize = 200) */
  getCases(): Observable<ResearchCase[]> {
    return this.getCasesPage(1, 200).pipe(map(p => p.cases));
  }

  /** Retrieve a single research case by its caseId (e.g. "PAT-00000013") */
  getCaseById(id: string): Observable<ResearchCase | null> {
    return this.http.get<ApiResearchCase>(
      `${environment.apiBaseUrl}/api/research-cases/${encodeURIComponent(id)}`
    ).pipe(
      map(mapCase),
      catchError(() => of(null))
    );
  }

  /** Retrieve examinations for a case from the real API */
  getExaminations(caseId: string): Observable<Examination[]> {
    return this.http.get<ApiExamination[]>(
      `${environment.apiBaseUrl}/api/research-cases/${encodeURIComponent(caseId)}/examinations`
    ).pipe(
      map(exams => exams.map(mapExamination)),
      catchError(() => of([]))
    );
  }

  /** Find cases similar to a given case using the real API */
  getSimilarCases(caseId: string, topN: number = 10): Observable<ResearchCase[]> {
    return this.http.get<{ results: ApiResearchCase[] }>(
      `${environment.apiBaseUrl}/api/research-cases/${encodeURIComponent(caseId)}/similar?topN=${topN}`
    ).pipe(
      map(r => r.results.map(mapCase)),
      catchError(() => of([]))
    );
  }

  /** Search similar cases by finding labels */
  searchSimilarByLabels(labels: string[], topN: number = 10): Observable<ResearchCase[]> {
    return this.http.post<{ results: ApiResearchCase[] }>(
      `${environment.apiBaseUrl}/api/search/similar-cases`,
      { findingLabels: labels, topN }
    ).pipe(
      map(r => r.results.map(mapCase)),
      catchError(() => of([]))
    );
  }

  /** Upload and retrieve visually similar cases from the ResNet-50/FAISS model. */
  runAnalysis(file: File, queryImagePreview: string): Observable<ResearchCase[]> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{
      storageKey: string;
      status: string;
      similarityMethod: string;
      totalResults: number;
      results: ApiResearchCase[];
    }>(
      `${environment.apiBaseUrl}/api/upload`,
      formData
    ).pipe(
      map(response => ({
        cases: (response.results ?? []).map(mapCase),
        method: response.similarityMethod
      })),
      tap(({ cases, method }) => this.setPendingResults(cases, method, queryImagePreview)),
      map(({ cases }) => cases),
      catchError(err => {
        console.warn('[CasesService] Visual upload/retrieval failed:', err);
        return throwError(() => err);
      })
    );
  }

  /** Run demo analysis — returns top 10 cases from the real dataset */
  runDemoAnalysis(): Observable<ResearchCase[]> {
    return this.getCases().pipe(
      map(cases => cases.slice(0, 10)),
      delay(1200)
    );
  }

  /** Add a new analysis session */
  addSession(session: AnalysisSession): void {
    this._recentSessions.set([session, ...this._recentSessions()].slice(0, 10));
  }
}
