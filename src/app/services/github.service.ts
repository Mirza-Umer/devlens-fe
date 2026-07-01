import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GitHubRepository {
  name: string;
  fullName: string;
  cloneUrl: string;
  private: boolean;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class GitHubService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  getGitHubStatus(): Observable<{ connected: boolean }> {
    return this.http.get<{ connected: boolean }>(`${this.apiUrl}/github-status`);
  }

  saveGitHubToken(token: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/github-token`, { token });
  }

  disconnectGitHub(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/github-token/disconnect`);
  }

  getGitHubRepositories(): Observable<GitHubRepository[]> {
    return this.http.get<GitHubRepository[]>(`${this.apiUrl}/github-repositories`);
  }
}
