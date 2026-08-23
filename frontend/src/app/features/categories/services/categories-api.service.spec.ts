import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api.config';
import { CategoriesManagementApiService } from './categories-api.service';

describe('CategoriesManagementApiService', () => {
  it('requests the complete category catalog', () => {
    TestBed.configureTestingModule({
      providers: [
        CategoriesManagementApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
    const service = TestBed.inject(CategoriesManagementApiService);
    const httpTesting = TestBed.inject(HttpTestingController);

    service.list().subscribe();

    const request = httpTesting.expectOne(
      (candidate) =>
        candidate.url === '/api/categorias' &&
        candidate.params.get('incluirInactivas') === 'true',
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
    httpTesting.verify();
  });
});
