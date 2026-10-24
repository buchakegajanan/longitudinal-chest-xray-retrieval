import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { CasesService } from '../../services/cases.service';
import { ResearchCase, Examination } from '../../models/models';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-timelines',
  standalone: true,
  imports: [CommonModule, RouterLink, TopbarComponent, IconComponent],
  templateUrl: './timelines.component.html',
  styleUrl: './timelines.component.scss'
})
export class TimelinesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private casesService = inject(CasesService);

  readonly isLoading = signal(true);
  readonly selectedCase = signal<ResearchCase | null>(null);
  readonly selectedExamIndex = signal(0);
  readonly allCases = signal<ResearchCase[]>([]);
  readonly hasCase = signal(false);

  ngOnInit(): void {
    const caseId = this.route.snapshot.paramMap.get('id');

    forkJoin({
      page: this.casesService.getCasesPage(1, 200),
      selected: caseId ? this.casesService.getCaseById(caseId) : of(null)
    }).subscribe(({ page, selected }) => {
      const found = selected ?? page.cases.find(c => c.id === caseId || c.caseIdentifier === caseId) ?? page.cases[0];
      const cases = found && !page.cases.some(c => c.id === found.id)
        ? [found, ...page.cases]
        : page.cases;
      this.allCases.set(cases);
      if (found) {
        this.selectedCase.set(found);
        this.hasCase.set(true);
      }
      this.isLoading.set(false);
    });
  }

  selectCase(c: ResearchCase): void {
    this.selectedCase.set(c);
    this.selectedExamIndex.set(0);
    this.router.navigate(['/timelines', c.id], { replaceUrl: true });
  }

  selectExamination(index: number): void {
    this.selectedExamIndex.set(index);
  }

  get currentExamination(): Examination | null {
    const c = this.selectedCase();
    if (!c) return null;
    return c.examinations[this.selectedExamIndex()] ?? null;
  }

  get previousExam(): Examination | null {
    const c = this.selectedCase();
    const idx = this.selectedExamIndex();
    if (!c || idx <= 0) return null;
    return c.examinations[idx - 1] ?? null;
  }

  get nextExam(): Examination | null {
    const c = this.selectedCase();
    const idx = this.selectedExamIndex();
    if (!c || idx >= c.examinations.length - 1) return null;
    return c.examinations[idx + 1] ?? null;
  }

  navigatePrev(): void {
    if (this.selectedExamIndex() > 0) {
      this.selectedExamIndex.update(i => i - 1);
    }
  }

  navigateNext(): void {
    const c = this.selectedCase();
    if (c && this.selectedExamIndex() < c.examinations.length - 1) {
      this.selectedExamIndex.update(i => i + 1);
    }
  }
}
