import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { Product, ProductUpsertPayload } from '../models/product.model';
import { StockAdjustmentPayload } from '../models/stock-adjustment.model';

@Injectable()
export class ProductsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_BASE_URL).replace(/\/$/, '')}/productos`;

  list(): Observable<readonly Product[]> {
    return this.http.get<readonly Product[]>(this.apiUrl);
  }

  getById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  create(payload: ProductUpsertPayload): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, payload);
  }

  update(id: number, payload: ProductUpsertPayload): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, payload);
  }

  adjustStock(id: number, payload: StockAdjustmentPayload): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/${id}/ajustes-stock`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
