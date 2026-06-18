import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService } from '../../services/dialog.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-overlay" *ngIf="dialogService.activeDialog() as dialog" (click)="close(false)">
      <div class="dialog-box" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>{{ dialog.title }}</h3>
        </div>
        <div class="dialog-body">
          <p>{{ dialog.message }}</p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" (click)="close(false)">{{ dialog.cancelText || 'Cancel' }}</button>
          <button class="btn btn-danger" (click)="close(true)">{{ dialog.confirmText || 'Confirm' }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    .dialog-box {
      width: 100%;
      max-width: 400px;
      padding: 24px;
      border-radius: 12px;
      background: rgba(20, 20, 20, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .dialog-header h3 {
      margin: 0 0 12px;
      font-size: 1.25rem;
      color: white;
    }
    .dialog-body p {
      margin: 0 0 24px;
      color: var(--text-muted, #a0a0a0);
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .btn-danger {
      background: #ef4444;
      color: white;
    }
    .btn-danger:hover {
      background: #dc2626;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleUp {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class DialogComponent {
  dialogService = inject(DialogService);

  close(result: boolean) {
    this.dialogService.close(result);
  }
}
