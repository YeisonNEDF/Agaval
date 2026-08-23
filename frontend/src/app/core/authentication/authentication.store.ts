import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../models/api-error.model';
import { AuthenticationApiService } from './authentication-api.service';
import { AuthSession, LoginPayload } from './authentication.model';

const SESSION_STORAGE_KEY = 'agaval.auth.session';

@Injectable({ providedIn: 'root' })
export class AuthenticationStore {
  private readonly authenticationApi = inject(AuthenticationApiService);
  private readonly sessionState = signal<AuthSession | null>(readStoredSession());
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private expirationTimer: ReturnType<typeof setTimeout> | null = null;

  readonly session = this.sessionState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly username = computed(() => this.sessionState()?.username ?? null);
  readonly accessToken = computed(() => this.sessionState()?.accessToken ?? null);

  constructor() {
    this.scheduleExpiration(this.sessionState());
  }

  async login(payload: LoginPayload): Promise<boolean> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const session = await firstValueFrom(this.authenticationApi.login(payload));
      this.setSession(session);
      return true;
    } catch (error: unknown) {
      this.errorState.set(
        error instanceof ApiError ? error.message : 'No fue posible iniciar sesión.',
      );
      return false;
    } finally {
      this.loadingState.set(false);
    }
  }

  logout(): void {
    this.setSession(null);
    this.errorState.set(null);
  }

  private setSession(session: AuthSession | null): void {
    this.sessionState.set(session);
    this.scheduleExpiration(session);

    if (session === null) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }

  private scheduleExpiration(session: AuthSession | null): void {
    if (this.expirationTimer !== null) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }

    if (session === null) {
      return;
    }

    const remainingMilliseconds = new Date(session.expiresAt).getTime() - Date.now();
    if (remainingMilliseconds <= 0) {
      this.logout();
      return;
    }

    this.expirationTimer = setTimeout(
      () => this.logout(),
      Math.min(remainingMilliseconds, 2_147_483_647),
    );
  }
}

function readStoredSession(): AuthSession | null {
  const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (storedSession === null) {
    return null;
  }

  try {
    const candidate: unknown = JSON.parse(storedSession);
    if (!isAuthSession(candidate) || new Date(candidate.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return candidate;
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record['accessToken'] === 'string' &&
    typeof record['expiresAt'] === 'string' &&
    typeof record['username'] === 'string' &&
    typeof record['role'] === 'string'
  );
}
