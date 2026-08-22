import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { Category } from '../models/category.model';

@Injectable()
export class CategoriesApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_BASE_URL).replace(/\/$/, '')}/categorias`;

  listActive(): Observable<readonly Category[]> {
    return this.http.get<readonly Category[]>(this.apiUrl);
  }
}
