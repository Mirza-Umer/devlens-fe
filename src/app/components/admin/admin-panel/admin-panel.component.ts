import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DialogService } from '../../../services/dialog.service';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  ipAddress: string;
  createdAt: string;
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private dialogService = inject(DialogService);
  
  users: User[] = [];
  loading = true;
  error: string | null = null;

  ngOnInit() {
    this.fetchUsers();
  }

  fetchUsers() {
    this.http.get<User[]>('http://localhost:3000/users').subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Failed to load users:', err);
        this.error = err.error?.message || 'Failed to load users. You may not have permission.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  async deleteUser(id: string) {
    const confirmed = await this.dialogService.confirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This will also delete all of their projects, files, and chat history. This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      this.http.delete(`http://localhost:3000/users/${id}`).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== id);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to delete user:', err);
          alert('Failed to delete user');
        }
      });
    }
  }
}
