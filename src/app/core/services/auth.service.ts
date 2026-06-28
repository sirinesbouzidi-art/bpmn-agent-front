import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from '../../shared/models/user.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  email: string;
  role: string; // le backend renvoie "ADMIN" ou "USER"
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: 'USER' | 'ADMIN';
}

export interface UserSummary {
  email: string;
  role: string;
  active: boolean;
  joinedAt: string; // format ISO renvoyé par le backend (LocalDate -> "yyyy-MM-dd")
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:8080/api/auth';
  private readonly adminUrl = 'http://localhost:8080/api/admin/users';
  private readonly TOKEN_KEY = 'bpmn-token';
  private readonly USER_KEY = 'bpmn-user';

  readonly currentUser = signal<User | null>(this.loadUser());

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap(response => {
          localStorage.setItem(this.TOKEN_KEY, response.token);

          const role = response.role.toLowerCase() as 'admin' | 'user';
          const user: User = { email: response.email, role };

          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
          this.currentUser.set(user);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'admin';
  }

  // ── Gestion des utilisateurs (admin uniquement) ──────────────────────

  createUser(request: CreateUserRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.adminUrl, request);
  }

  listUsers(): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(this.adminUrl);
  }

  deleteUser(email: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.adminUrl}/${encodeURIComponent(email)}`);
  }

  toggleUserStatus(email: string, active: boolean): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.adminUrl}/${encodeURIComponent(email)}/status`,
      { active }
    );
  }

  private loadUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
}