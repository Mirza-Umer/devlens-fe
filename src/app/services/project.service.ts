import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Project {
  id: number;
  name: string;
  path: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/projects';

  selectedProject = signal<Project | null>(null);

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl);
  }

  createProject(name: string, path: string): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, { name, path });
  }

  deleteProject(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  scanProject(id: number): Observable<{ message: string; filesScanned: number }> {
    return this.http.post<{ message: string; filesScanned: number }>(`${this.apiUrl}/${id}/scan`, {});
  }
}
