import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { PagedResult } from '../../../shared/models/paged-result.model';
import {
  InventoryMovement,
  InventoryMovementQuery,
  MovementProductOption,
} from '../models/inventory-movement.model';

@Injectable()
export class InventoryMovementsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL).replace(/\/$/, '');

  list(query: InventoryMovementQuery): Observable<PagedResult<InventoryMovement>> {
    let params = new HttpParams()
      .set('pagina', query.pageNumber)
      .set('tamanoPagina', query.pageSize)
      .set('direccion', 'Descending');

    if (query.productId !== null) {
      params = params.set('productoId', query.productId);
    }
    if (query.type !== null) {
      params = params.set('tipo', query.type);
    }

    return this.http.get<PagedResult<InventoryMovement>>(
      `${this.apiBaseUrl}/movimientos-inventario`,
      { params },
    );
  }

  listProducts(): Observable<PagedResult<MovementProductOption>> {
    const params = new HttpParams()
      .set('pagina', 1)
      .set('tamanoPagina', 100)
      .set('ordenarPor', 'Name');
    return this.http.get<PagedResult<MovementProductOption>>(`${this.apiBaseUrl}/productos`, {
      params,
    });
  }
}
