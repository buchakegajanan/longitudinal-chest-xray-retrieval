import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { DatasetService } from '../../services/dataset.service';
import { DatasetRecord, DatasetSummary } from '../../models/models';

@Component({
  selector: 'app-dataset',
  standalone: true,
  imports: [CommonModule, TopbarComponent, IconComponent],
  templateUrl: './dataset.component.html',
  styleUrl: './dataset.component.scss'
})
export class DatasetComponent implements OnInit {
  private datasetService = inject(DatasetService);

  readonly summary = signal<DatasetSummary | null>(null);
  readonly records = signal<DatasetRecord[]>([]);
  readonly filteredRecords = signal<DatasetRecord[]>([]);
  readonly isLoading = signal(true);
  readonly searchQuery = signal('');
  readonly statusFilter = signal('');

  ngOnInit(): void {
    this.datasetService.getDatasetSummary().subscribe(s => this.summary.set(s));
    this.datasetService.getDatasetRecords().subscribe(r => {
      this.records.set(r);
      this.filteredRecords.set(r);
      this.isLoading.set(false);
    });
  }

  onSearchInput(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.searchQuery.set(q);
    this.applyFilters(q, this.statusFilter());
  }

  onStatusChange(event: Event): void {
    const s = (event.target as HTMLSelectElement).value;
    this.statusFilter.set(s);
    this.applyFilters(this.searchQuery(), s);
  }

  private applyFilters(q: string, status: string): void {
    this.datasetService.searchRecords(q, status).subscribe(r => {
      this.filteredRecords.set(r);
    });
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'indexed': return 'badge-green';
      case 'pending': return 'badge-amber';
      case 'error': return 'badge-red';
      default: return 'badge-grey';
    }
  }

  getIndexProgress(): number {
    const s = this.summary();
    if (!s || s.totalCases === 0) return 0;
    return Math.round((s.indexedCases / s.totalCases) * 100);
  }
}
