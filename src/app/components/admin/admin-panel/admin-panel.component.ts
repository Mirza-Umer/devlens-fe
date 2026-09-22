import { Component, OnInit, inject, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DialogService } from '../../../services/dialog.service';
import { environment } from '../../../../environments/environment';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  ipAddress: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
  org?: string;
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

  // Active sub-panel tab
  activeTab = signal<'list' | 'locations'>('list');

  // Interactive Pin States
  hoveredUserPin = signal<User | null>(null);
  selectedUserPin = signal<User | null>(null);

  // Computed metrics for geolocations
  geolocatedUsers = computed(() => {
    return this.users.filter(u => u.latitude && u.longitude);
  });

  totalGeolocated = computed(() => this.geolocatedUsers().length);
  uniqueCountries = computed(() => {
    const countries = this.geolocatedUsers().map(u => u.country).filter(Boolean);
    return new Set(countries).size;
  });

  uniqueCities = computed(() => {
    const cities = this.geolocatedUsers().map(u => u.city).filter(Boolean);
    return new Set(cities).size;
  });

  topCountry = computed(() => {
    const geoUsers = this.geolocatedUsers();
    if (geoUsers.length === 0) return { name: 'None', count: 0, percentage: 0 };

    const counts: Record<string, number> = {};
    geoUsers.forEach(u => {
      if (u.country) {
        counts[u.country] = (counts[u.country] || 0) + 1;
      }
    });

    let top = 'Unknown';
    let max = 0;
    Object.entries(counts).forEach(([country, count]) => {
      if (count > max) {
        max = count;
        top = country;
      }
    });

    const percentage = Math.round((max / geoUsers.length) * 100);
    return { name: top, count: max, percentage };
  });

  countryStats = computed(() => {
    const geoUsers = this.geolocatedUsers();
    const counts: Record<string, number> = {};

    geoUsers.forEach(u => {
      if (u.country) {
        counts[u.country] = (counts[u.country] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / geoUsers.length) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5
  });

  ngOnInit() {
    this.fetchUsers();
  }

  fetchUsers() {
    this.http.get<User[]>(`${environment.apiUrl}/users`).subscribe({
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

  // Projection formula (Equirectangular) mapping GPS lat/lon to SVG 1000x500
  getMapX(longitude?: string): number {
    if (!longitude) return 0;
    const lon = parseFloat(longitude);
    if (isNaN(lon)) return 0;
    // Map -180...180 to 0...1000
    return (lon + 180) * (1000 / 360);
  }

  getMapY(latitude?: string): number {
    if (!latitude) return 0;
    const lat = parseFloat(latitude);
    if (isNaN(lat)) return 0;
    // Map 90...-90 to 0...500
    return (90 - lat) * (500 / 180);
  }

  selectTab(tab: 'list' | 'locations') {
    this.activeTab.set(tab);
    this.selectedUserPin.set(null);
    this.hoveredUserPin.set(null);
  }

  setHoveredPin(user: User | null) {
    this.hoveredUserPin.set(user);
  }

  setSelectedPin(user: User | null) {
    if (this.selectedUserPin()?.id === user?.id) {
      this.selectedUserPin.set(null); // toggle off
    } else {
      this.selectedUserPin.set(user);
    }
  }

  async deleteUser(id: string) {
    const confirmed = await this.dialogService.confirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This will also delete all of their projects, files, and chat history. This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      this.http.delete(`${environment.apiUrl}/users/${id}`).subscribe({
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