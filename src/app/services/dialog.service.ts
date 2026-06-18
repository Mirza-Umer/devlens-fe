import { Injectable, signal } from '@angular/core';

export interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  activeDialog = signal<DialogOptions | null>(null);
  private resolveFn: ((value: boolean) => void) | null = null;

  confirm(options: DialogOptions): Promise<boolean> {
    this.activeDialog.set(options);
    return new Promise(resolve => {
      this.resolveFn = resolve;
    });
  }

  close(result: boolean) {
    if (this.resolveFn) {
      this.resolveFn(result);
      this.resolveFn = null;
    }
    this.activeDialog.set(null);
  }
}
