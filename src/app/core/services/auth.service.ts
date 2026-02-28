import { Injectable, signal } from '@angular/core';
import { User } from '../../shared/models/user.model';

interface Credentials {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'bpmn-user-session';
  private readonly mockAccounts: Array<Credentials & { role: User['role'] }> = [
    { email: 'admin@bouygues.com', password: 'admin123', role: 'admin' },
    { email: 'user@bouygues.com', password: 'user123', role: 'user' }
  ];

  readonly currentUser = signal<User | null>(this.loadSession());

  login(email: string, password: string): boolean {
    const account = this.mockAccounts.find(
      (user) => user.email === email.trim().toLowerCase() && user.password === password
    );

    if (!account) {
      return false;
    }

    const sessionUser: User = { email: account.email, role: account.role };
    localStorage.setItem(this.storageKey, JSON.stringify(sessionUser));
    this.currentUser.set(sessionUser);
    return true;
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.currentUser.set(null);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  private loadSession(): User | null {
    const session = localStorage.getItem(this.storageKey);
    if (!session) {
      return null;
    }

    try {
      return JSON.parse(session) as User;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }
}
