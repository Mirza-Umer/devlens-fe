import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AiResponse {
  answer: string;
  filesUsed: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/ai';

  chat(projectId: number, question: string): Observable<AiResponse> {
    return this.http.post<AiResponse>(`${this.apiUrl}/chat`, { projectId, question });
  }

  getHistory(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/chat/${projectId}`);
  }
}
