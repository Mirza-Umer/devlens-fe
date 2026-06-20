import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/auth';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.currentUserSubject.next({
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          role: payload.role,
          token
        });
      } catch (e) {
        console.error('Failed to decode token on reload', e);
        this.logout();
      }
    }
  }

  public get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response && response.access_token) {
          localStorage.setItem('access_token', response.access_token);
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  getGoogleClientId(): Observable<{ googleClientId: string }> {
    return this.http.get<{ googleClientId: string }>(`${this.apiUrl}/config`);
  }

  googleLogin(token: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/google`, { token }).pipe(
      tap(response => {
        if (response && response.access_token) {
          localStorage.setItem('access_token', response.access_token);
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => {
        if (response && response.access_token) {
          localStorage.setItem('access_token', response.access_token);
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken() {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
