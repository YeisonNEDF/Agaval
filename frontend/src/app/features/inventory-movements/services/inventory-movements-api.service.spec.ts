import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api.config';
import { InventoryMovementsApiService } from './inventory-movements-api.service';

describe('InventoryMovementsApiService', () => {
  it('sends movement filters and pagination to the API', () => {
    TestBed.configureTestingModule({
      providers: [
        InventoryMovementsApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        { provide: API_BASE_URL, useValue: '/api/' },
      ],
    });
    const service = TestBed.inject(InventoryMovementsApiService);
    const httpTesting = TestBed.inject(HttpTestingController);

    service
      .list({ productId: 8, type: 'Entry', pageNumber: 2, pageSize: 25 })
      .subscribe();

    const request = httpTesting.expectOne(
      (candidate) =>
        candidate.url === '/api/movimientos-inventario' &&
        candidate.params.get('productoId') === '8' &&
        candidate.params.get('tipo') === 'Entry' &&
        candidate.params.get('pagina') === '2' &&
        candidate.params.get('tamanoPagina') === '25',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ items: [], pageNumber: 2, pageSize: 25, totalCount: 0 });
    httpTesting.verify();
  });
});
