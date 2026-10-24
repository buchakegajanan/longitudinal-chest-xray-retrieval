import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { DatasetRecord, DatasetSummary } from '../models/models';
import { CasesService } from './cases.service';
import { environment } from '../../environments/environment';

interface DatasetMetadataResponse {
  datasetName: string;
  totalCases: number;
  casesWithFollowups: number;
  totalImageRecords: number;
  availableImageFiles: number;
}

/**
 * Dataset Service — manages research dataset records.
 * Future: integrates with ASP.NET Core API for real indexing status.
 */
@Injectable({ providedIn: 'root' })
export class DatasetService {
  private readonly http = inject(HttpClient);
  private readonly casesService = inject(CasesService);

  getDatasetSummary(): Observable<DatasetSummary> {
    return this.http.get<DatasetMetadataResponse>(`${environment.apiBaseUrl}/api/dataset/metadata`).pipe(
      map(metadata => ({
        name: metadata.datasetName,
        description: 'Chest X-ray research cases loaded from the configured CSV dataset.',
        totalCases: metadata.totalCases,
        indexedCases: metadata.totalCases,
        pendingCases: 0,
        totalImages: metadata.totalImageRecords,
        lastUpdated: new Date().toISOString(),
        source: metadata.datasetName,
        status: metadata.availableImageFiles > 0 ? 'available' as const : 'partial' as const
      }))
    );
  }

  getDatasetRecords(): Observable<DatasetRecord[]> {
    return this.casesService.getCases().pipe(
      map(cases => cases.map(c => ({
        id: c.id,
        caseIdentifier: c.caseIdentifier,
        status: 'indexed' as const,
        imageCount: c.totalExaminations,
        followUpCount: Math.max(0, c.totalExaminations - 1),
        hasMetadata: c.demographicsAvailable,
        hasLabels: c.conditionTags.length > 0,
        conditionTags: c.conditionTags,
        indexedAt: c.indexedAt
      })))
    );
  }

  searchRecords(query: string, statusFilter: string): Observable<DatasetRecord[]> {
    const q = query.trim().toLowerCase();
    return this.getDatasetRecords().pipe(
      map(records => records.filter(r => {
        const matchesQuery = !q ||
          r.caseIdentifier.toLowerCase().includes(q) ||
          r.conditionTags.some(tag => tag.toLowerCase().includes(q));
        const matchesStatus = !statusFilter || r.status === statusFilter;
        return matchesQuery && matchesStatus;
      })),
      catchError(() => of([]))
    );
  }
}
