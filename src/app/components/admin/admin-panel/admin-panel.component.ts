import { Component, OnInit, inject, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DialogService } from '../../../services/dialog.service';
import { environment } from '../../../../environments/environment';

export interface User {
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

export interface MapCluster {
  id: string;
  x: number;
  y: number;
  count: number;
  country?: string;
  city?: string;
  users: User[];
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private dialogService = inject(DialogService);

  users = signal<User[]>([]);
  loading = true;
  error: string | null = null;

  // Active sub-panel tab
  activeTab = signal<'list' | 'locations'>('list');

  // Search and Filters
  searchQuery = signal<string>('');
  roleFilter = signal<string>('all');
  countryFilter = signal<string>('all');

  // Pagination
  pageSize = signal<number>(10);
  currentPage = signal<number>(1);

  // Interactive Cluster & Pin States
  hoveredUserPin = signal<User | null>(null);
  selectedUserPin = signal<User | null>(null);
  hoveredCluster = signal<MapCluster | null>(null);
  selectedCluster = signal<MapCluster | null>(null);

  // Computed metrics for geolocations
  geolocatedUsers = computed(() => {
    return this.users().filter(u => u.latitude && u.longitude);
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

  availableCountries = computed(() => {
    const countries = this.users()
      .map(u => u.country)
      .filter((c): c is string => Boolean(c));
    return Array.from(new Set(countries)).sort();
  });

  filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const role = this.roleFilter();
    const country = this.countryFilter();

    return this.users().filter(u => {
      if (role !== 'all' && u.role !== role) {
        return false;
      }

      if (country !== 'all' && u.country !== country) {
        return false;
      }

      if (query) {
        const matchName = u.name?.toLowerCase().includes(query);
        const matchEmail = u.email?.toLowerCase().includes(query);
        const matchIp = u.ipAddress?.toLowerCase().includes(query);
        const matchCity = u.city?.toLowerCase().includes(query);
        const matchCountry = u.country?.toLowerCase().includes(query);
        const matchRegion = u.region?.toLowerCase().includes(query);

        return Boolean(matchName || matchEmail || matchIp || matchCity || matchCountry || matchRegion);
      }

      return true;
    });
  });

  totalPages = computed(() => {
    const total = this.filteredUsers().length;
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  paginatedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 2;
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    const start = Math.max(1, current - delta);
    const end = Math.min(total, current + delta);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
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
    if (geoUsers.length === 0) return [];
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

  // Cluster pins that are geographically close on the 1000x500 map
  mapClusters = computed<MapCluster[]>(() => {
    const users = this.geolocatedUsers();
    const clusters: MapCluster[] = [];
    const CLUSTER_THRESHOLD = 25; // 25px threshold in 1000x500 map coordinates

    for (const user of users) {
      const x = this.getMapX(user.longitude);
      const y = this.getMapY(user.latitude);

      const existingCluster = clusters.find(c => {
        const dx = c.x - x;
        const dy = c.y - y;
        return Math.sqrt(dx * dx + dy * dy) < CLUSTER_THRESHOLD;
      });

      if (existingCluster) {
        existingCluster.users.push(user);
        existingCluster.count++;
        // Recalculate centroid
        existingCluster.x = (existingCluster.x * (existingCluster.count - 1) + x) / existingCluster.count;
        existingCluster.y = (existingCluster.y * (existingCluster.count - 1) + y) / existingCluster.count;
        if (!existingCluster.city && user.city) existingCluster.city = user.city;
        if (!existingCluster.country && user.country) existingCluster.country = user.country;
      } else {
        clusters.push({
          id: `cluster-${user.id}-${Math.round(x)}-${Math.round(y)}`,
          x,
          y,
          count: 1,
          country: user.country,
          city: user.city,
          users: [user]
        });
      }
    }

    return clusters;
  });

  ngOnInit() {
    this.fetchUsers();
  }

  fetchUsers() {
    this.http.get<User[]>(`${environment.apiUrl}/users`).subscribe({
      next: (data) => {
        this.users.set(data);
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
    this.selectedCluster.set(null);
    this.hoveredCluster.set(null);
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

  setHoveredCluster(cluster: MapCluster | null) {
    this.hoveredCluster.set(cluster);
  }

  setSelectedCluster(cluster: MapCluster | null) {
    if (this.selectedCluster()?.id === cluster?.id) {
      this.selectedCluster.set(null);
    } else {
      this.selectedCluster.set(cluster);
    }
  }

  getTooltipStyle(cluster: MapCluster | null): Record<string, string> {
    if (!cluster) return { display: 'none' };
    const leftPercent = (cluster.x / 1000) * 100;
    const topPercent = (cluster.y / 500) * 100;
    const isNearTop = topPercent < 35;

    return {
      left: `${leftPercent}%`,
      top: `${topPercent}%`,
      transform: isNearTop 
        ? 'translate(-50%, 20px)' 
        : 'translate(-50%, calc(-100% - 20px))'
    };
  }

  selectUserLocation(user: User) {
    const targetCluster = this.mapClusters().find(c => c.users.some(u => u.id === user.id));
    if (targetCluster) {
      this.selectedCluster.set(targetCluster);
    }
  }

  getCountryFlag(country?: string): string {
    if (!country) return '🌐';
    const trimmed = country.trim();
    if (trimmed.length === 2) {
      const codePoints = trimmed
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    }

    const nameMap: Record<string, string> = {
      'united states': 'US',
      'united states of america': 'US',
      'usa': 'US',
      'united kingdom': 'GB',
      'uk': 'GB',
      'canada': 'CA',
      'germany': 'DE',
      'france': 'FR',
      'india': 'IN',
      'pakistan': 'PK',
      'china': 'CN',
      'japan': 'JP',
      'brazil': 'BR',
      'australia': 'AU',
      'netherlands': 'NL',
      'russia': 'RU',
      'spain': 'ES',
      'italy': 'IT'
    };

    const code = nameMap[trimmed.toLowerCase()];
    if (code) {
      const codePoints = code
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    }

    return '🌐';
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onRoleFilterChange(role: string) {
    this.roleFilter.set(role);
    this.currentPage.set(1);
  }

  onCountryFilterChange(country: string) {
    this.countryFilter.set(country);
    this.currentPage.set(1);
  }

  resetFilters() {
    this.searchQuery.set('');
    this.roleFilter.set('all');
    this.countryFilter.set('all');
    this.currentPage.set(1);
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
          this.users.update(current => current.filter(u => u.id !== id));
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