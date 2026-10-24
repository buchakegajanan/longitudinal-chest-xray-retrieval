import { Component, signal, inject, ElementRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { CasesService } from '../../services/cases.service';
import { UploadedImage } from '../../models/models';

type AnalysisState = 'idle' | 'analysing' | 'complete' | 'error';

const MAX_FILE_SIZE_MB = 20;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, TopbarComponent, IconComponent],
  templateUrl: './analysis.component.html',
  styleUrl: './analysis.component.scss'
})
export class AnalysisComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private router = inject(Router);
  private casesService = inject(CasesService);

  readonly state = signal<AnalysisState>('idle');
  readonly isDragOver = signal(false);
  readonly uploadedImage = signal<UploadedImage | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly analysisProgress = signal(0);
  readonly visualServiceOnline = signal<'loading' | 'ready' | 'offline'>('loading');
  readonly visualIndexProgress = signal('Checking visual-search service...');

  readonly allowedFormats = ALLOWED_EXTENSIONS.join(', ');

  ngOnInit(): void {
    this.casesService.getVisualSearchStatus().subscribe(status => {
      this.visualServiceOnline.set(status.state);
      this.visualIndexProgress.set(status.progressText);
    });
  }

  triggerFileSelect(): void {
    this.fileInputRef?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processFile(file);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  private processFile(file: File): void {
    this.errorMessage.set(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      this.errorMessage.set(
        `Unsupported format. Please upload JPEG or PNG. Received: ${file.type || 'unknown'}`
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      this.errorMessage.set(
        `File too large. Max ${MAX_FILE_SIZE_MB} MB. File: ${(file.size / 1024 / 1024).toFixed(1)} MB`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const previewUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        this.uploadedImage.set({
          file, previewUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          sizeBytes: file.size,
          validationStatus: 'valid',
        });
        this.state.set('idle');
      };
      img.onerror = () => {
        this.errorMessage.set('Could not read the file as an image. Please try another file.');
      };
      img.src = previewUrl;
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.uploadedImage.set(null);
    this.errorMessage.set(null);
    this.state.set('idle');
  }

  replaceImage(): void {
    this.triggerFileSelect();
  }

  startAnalysis(): void {
    const image = this.uploadedImage();
    if (!image || this.state() === 'analysing') return;

    this.state.set('analysing');
    this.errorMessage.set(null);
    this.analysisProgress.set(0);

    const progressInterval = setInterval(() => {
      const current = this.analysisProgress();
      if (current < 88) {
        this.analysisProgress.set(current + Math.random() * 12);
      } else {
        clearInterval(progressInterval);
      }
    }, 250);

    this.casesService.runAnalysis(image.file, image.previewUrl).subscribe({
      next: (cases) => {
        clearInterval(progressInterval);
        this.analysisProgress.set(100);

        this.casesService.addSession({
          id: 'session-' + Date.now(),
          createdAt: new Date().toISOString(),
          uploadedFileName: image.file.name,
          status: 'completed',
          resultCount: cases.length,
          topCaseId: cases[0]?.caseIdentifier,
        });
        setTimeout(() => {
          this.state.set('complete');
          setTimeout(() => this.router.navigate(['/similar-cases']), 400);
        }, 300);
      },
      error: () => {
        clearInterval(progressInterval);
        this.state.set('error');
        this.errorMessage.set(
          'Visual retrieval failed. Verify that the API and ResNet-50/FAISS service on port 5100 are running, then try again.'
        );
      }
    });
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
}
