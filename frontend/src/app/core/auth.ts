import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Me } from './models';

/**
 * Sesión del usuario. La mantiene el servidor en una cookie HttpOnly; aquí solo se guarda quién es.
 * En el render del servidor siempre se trata como visitante: la sesión se consulta al llegar al navegador.
 */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private loading: Promise<void> | null = null;

  readonly user = signal<Me | null>(null);
  readonly providers = signal<string[]>([]);
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');

  /** Consulta la sesión una sola vez; las llamadas siguientes esperan a la misma respuesta. */
  ready(): Promise<void> {
    if (!this.isBrowser) {
      return Promise.resolve();
    }
    this.loading ??= Promise.all([
      firstValueFrom(this.http.get<Me | null>('/api/auth/me')).then((me) => this.user.set(me ?? null)),
      firstValueFrom(this.http.get<{ oauth: string[] }>('/api/auth/providers')).then((providers) =>
        this.providers.set(providers.oauth),
      ),
    ]).then(
      () => undefined,
      () => undefined,
    );
    return this.loading;
  }

  async login(email: string, password: string): Promise<void> {
    this.user.set(await firstValueFrom(this.http.post<Me>('/api/auth/login', { email, password })));
  }

  async register(email: string, displayName: string, password: string): Promise<void> {
    this.user.set(
      await firstValueFrom(this.http.post<Me>('/api/auth/register', { email, displayName, password })),
    );
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/logout', {}));
    this.user.set(null);
  }

  async updateProfile(displayName: string, avatarUrl: string): Promise<void> {
    this.user.set(await firstValueFrom(this.http.put<Me>('/api/auth/profile', { displayName, avatarUrl })));
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await firstValueFrom(this.http.put('/api/auth/password', { currentPassword, newPassword }));
    this.user.update((me) => (me ? { ...me, hasPassword: true } : me));
  }

  forgotPassword(email: string): Promise<unknown> {
    return firstValueFrom(this.http.post('/api/auth/forgot-password', { email }));
  }

  resetPassword(token: string, password: string): Promise<unknown> {
    return firstValueFrom(this.http.post('/api/auth/reset-password', { token, password }));
  }

  verifyEmail(token: string): Promise<unknown> {
    return firstValueFrom(this.http.post('/api/auth/verify-email', { token })).then(() =>
      this.user.update((me) => (me ? { ...me, emailVerified: true } : me)),
    );
  }

  resendVerification(): Promise<unknown> {
    return firstValueFrom(this.http.post('/api/auth/resend-verification', {}));
  }
}
