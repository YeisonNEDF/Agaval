import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthSession, LoginPayload } from './authentication.model';

@Injectable({ providedIn: 'root' })
export class AuthenticationApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_BASE_URL).replace(/\/$/, '')}/autenticacion`;

  login(payload: LoginPayload): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${this.apiUrl}/login`, payload);
  }
}
