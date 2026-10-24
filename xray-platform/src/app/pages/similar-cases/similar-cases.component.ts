import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { CasesService } from '../../services/cases.service';
import { ResearchCase } from '../../models/models';
import { ALL_CONDITION_TAGS } from '../../data/mock-data';

type SortOption = 'similarity' | 'followups' | 'identifier';

@Component({
  selector: 'app-similar-cases',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TopbarComponent, IconComponent],
  templateUrl: './similar-cases.component.html',
  styleUrl: './similar-cases.component.scss'
})
export class SimilarCasesComponent implements OnInit {
  private casesService: CasesService;

  readonly allCases = signal<ResearchCase[]>([]);
  readonly isLoading = signal(true);
  readonly searchQuery = signal('');
  readonly selectedTags = signal<string[]>([]);
  readonly selectedSort = signal<SortOption>('similarity');
  readonly minFollowups = signal(0);
  readonly queryImagePreview = signal<string | null>(null);
  readonly queryLabels = signal<string[]>([]);
  readonly isSearchResults = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = 24;

  readonly allTags = ALL_CONDITION_TAGS;
  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'similarity', label: 'Similarity score' },
    { value: 'followups', label: 'Follow-up count' },
    { value: 'identifier', label: 'Case identifier' },
  ];

  readonly filteredCases = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const tags = this.selectedTags();
    const minFu = this.minFollowups();

    let results = this.allCases().filter(c => {
      const matchesQuery = !q ||
        c.caseIdentifier.toLowerCase().includes(q) ||
        c.conditionTags.some(t => t.toLowerCase().includes(q));
      const matchesTags = tags.length === 0 || tags.every(tag => c.conditionTags.includes(tag));
      const matchesFollowups = c.totalExaminations - 1 >= minFu;
      return matchesQuery && matchesTags && matchesFollowups;
    });

    const sort = this.selectedSort();
    if (sort === 'similarity') {
      results = results.sort((a, b) => (b.similarityScore ?? 0) - (a.similarityScore ?? 0));
    } else if (sort === 'followups') {
      results = results.sort((a, b) => b.totalExaminations - a.totalExaminations);
    } else {
      results = results.sort((a, b) => a.caseIdentifier.localeCompare(b.caseIdentifier));
    }

    return results;
  });

  readonly visibleCases = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredCases().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredCases().length / this.pageSize)));

  constructor(casesService: CasesService) {
    this.casesService = casesService;
  }

  readonly queryMethod = signal<'visual' | 'label' | null>(null);

  ngOnInit(): void {
    // Check if there are results from a just-completed upload analysis
    const pending = this.casesService.takePendingResults();
    if (pending) {
      this.allCases.set(pending.cases);
      this.queryImagePreview.set(pending.queryImagePreview);
      this.queryMethod.set(pending.method.toLowerCase().includes('resnet') ? 'visual' : 'label');
      this.isSearchResults.set(true);
      this.isLoading.set(false);
      return;
    }

    // Otherwise load the full research dataset
    this.casesService.getCases().subscribe({
      next: (cases) => {
        this.allCases.set(cases);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  toggleTag(tag: string): void {
    this.currentPage.set(1);
    const current = this.selectedTags();
    if (current.includes(tag)) {
      this.selectedTags.set(current.filter(t => t !== tag));
    } else {
      this.selectedTags.set([...current, tag]);
    }
  }

  clearFilters(): void {
    this.currentPage.set(1);
    this.searchQuery.set('');
    this.selectedTags.set([]);
    this.minFollowups.set(0);
  }

  hasActiveFilters(): boolean {
    return !!this.searchQuery() || this.selectedTags().length > 0 || this.minFollowups() > 0;
  }

  getSimilarityClass(score: number): string {
    if (score >= 0.8) return 'badge-green';
    if (score >= 0.65) return 'badge-blue';
    return 'badge-grey';
  }

  getSimilarityLabel(score: number): string {
    if (score >= 0.8) return 'High';
    if (score >= 0.65) return 'Moderate';
    return 'Low';
  }

  onSearchInput(event: Event): void {
    this.currentPage.set(1);
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onSortChange(event: Event): void {
    this.selectedSort.set((event.target as HTMLSelectElement).value as SortOption);
  }

  onMinFollowupsChange(event: Event): void {
    this.currentPage.set(1);
    this.minFollowups.set(Number((event.target as HTMLSelectElement).value));
  }

  previousPage(): void {
    this.currentPage.update(page => Math.max(1, page - 1));
  }

  nextPage(): void {
    this.currentPage.update(page => Math.min(this.totalPages(), page + 1));
  }
}
