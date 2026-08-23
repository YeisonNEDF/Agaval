import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  CreateCategoryPayload,
  ManagedCategory,
  UpdateCategoryPayload,
} from '../models/category.model';

@Injectable()
export class CategoriesManagementApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_BASE_URL).replace(/\/$/, '')}/categorias`;

  list(): Observable<readonly ManagedCategory[]> {
    const params = new HttpParams().set('incluirInactivas', true);
    return this.http.get<readonly ManagedCategory[]>(this.apiUrl, { params });
  }

  create(payload: CreateCategoryPayload): Observable<ManagedCategory> {
    return this.http.post<ManagedCategory>(this.apiUrl, payload);
  }

  update(id: number, payload: UpdateCategoryPayload): Observable<ManagedCategory> {
    return this.http.put<ManagedCategory>(`${this.apiUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
