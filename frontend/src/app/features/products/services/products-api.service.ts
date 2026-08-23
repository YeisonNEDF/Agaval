import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { PagedResult } from '../../../shared/models/paged-result.model';
import {
  InventorySummary,
  Product,
  ProductQuery,
  ProductUpsertPayload,
} from '../models/product.model';
import { StockAdjustmentPayload } from '../models/stock-adjustment.model';

@Injectable()
export class ProductsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_BASE_URL).replace(/\/$/, '')}/productos`;

  list(query: ProductQuery): Observable<PagedResult<Product>> {
    let params = new HttpParams()
      .set('stock', query.stock)
      .set('pagina', query.pageNumber)
      .set('tamanoPagina', query.pageSize)
      .set('ordenarPor', query.sortBy)
      .set('direccion', query.sortDirection);

    if (query.categoryId !== null) {
      params = params.set('categoriaId', query.categoryId);
    }
    if (query.search.trim().length > 0) {
      params = params.set('buscar', query.search.trim());
    }

    return this.http.get<PagedResult<Product>>(this.apiUrl, { params });
  }

  getSummary(): Observable<InventorySummary> {
    return this.http.get<InventorySummary>(`${this.apiUrl}/resumen`);
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
