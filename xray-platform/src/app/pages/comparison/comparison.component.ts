import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { CasesService } from '../../services/cases.service';
import { ResearchCase, Examination } from '../../models/models';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-comparison',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TopbarComponent, IconComponent],
  templateUrl: './comparison.component.html',
  styleUrl: './comparison.component.scss'
})
export class ComparisonComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private casesService = inject(CasesService);

  readonly selectedCase = signal<ResearchCase | null>(null);
  readonly allCases = signal<ResearchCase[]>([]);
  readonly leftIndex = signal(0);
  readonly rightIndex = signal(1);
  readonly zoomLevel = signal(100);
  readonly isFitToScreen = signal(true);
  readonly isLoading = signal(true);
  readonly queryImagePreview = this.casesService.latestQueryImagePreview;
  readonly leftUsesQueryImage = signal(false);

  ngOnInit(): void {
    const caseId = this.route.snapshot.queryParamMap.get('case');
    forkJoin({
      page: this.casesService.getCasesPage(1, 200),
      selected: caseId ? this.casesService.getCaseById(caseId) : of(null)
    }).subscribe(({ page, selected }) => {
      const cases = selected && !page.cases.some(c => c.id === selected.id)
        ? [selected, ...page.cases]
        : page.cases;
      this.allCases.set(cases);
      // Prefer the case matching the query param, then first case
      const found = selected ?? cases.find(c => c.id === caseId || c.caseIdentifier === caseId) ?? cases[0];
      if (found) {
        this.selectedCase.set(found);
        this.leftIndex.set(0);
        this.rightIndex.set(found.examinations.length > 1 ? 1 : 0);
        this.leftUsesQueryImage.set(!!this.queryImagePreview());
      }
      this.isLoading.set(false);
    });
  }

  get leftExam(): Examination | null {
    const c = this.selectedCase();
    return c?.examinations[this.leftIndex()] ?? null;
  }

  get rightExam(): Examination | null {
    const c = this.selectedCase();
    return c?.examinations[this.rightIndex()] ?? null;
  }

  selectCase(c: ResearchCase): void {
    this.selectedCase.set(c);
    this.leftIndex.set(0);
    this.rightIndex.set(c.examinations.length > 1 ? 1 : 0);
  }

  onCaseChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.selectCaseById(id);
  }

  onCaseIdChange(id: string): void {
    this.selectCaseById(id);
  }

  private selectCaseById(id: string): void {
    const selected = this.allCases().find(c => c.id === id);
    if (selected) this.selectCase(selected);
  }

  selectQueryImage(): void { this.leftUsesQueryImage.set(true); }
  selectLeft(i: number): void {
    this.leftUsesQueryImage.set(false);
    this.leftIndex.set(i);
  }
  selectRight(i: number): void { this.rightIndex.set(i); }

  zoomIn(): void {
    this.isFitToScreen.set(false);
    this.zoomLevel.update(z => Math.min(z + 25, 400));
  }

  zoomOut(): void {
    this.isFitToScreen.set(false);
    this.zoomLevel.update(z => Math.max(z - 25, 25));
  }

  fitToScreen(): void {
    this.isFitToScreen.set(true);
    this.zoomLevel.set(100);
  }

  resetView(): void {
    this.isFitToScreen.set(true);
    this.zoomLevel.set(100);
  }

  get imageStyle(): Record<string, string> {
    if (this.isFitToScreen()) {
      return { 'max-width': '100%', 'max-height': '100%', 'width': 'auto', 'height': 'auto' };
    }
    return { 'width': this.zoomLevel() + '%', 'max-width': 'none', 'height': 'auto' };
  }
}
