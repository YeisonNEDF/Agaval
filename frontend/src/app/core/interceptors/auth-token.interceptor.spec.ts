import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthenticationStore } from '../authentication/authentication.store';
import { authTokenInterceptor } from './auth-token.interceptor';

describe('authTokenInterceptor', () => {
  it('adds the bearer token to API requests', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        {
          provide: AuthenticationStore,
          useValue: { accessToken: signal('signed-token'), logout: jasmine.createSpy('logout') },
        },
      ],
    });
    const http = TestBed.inject(HttpClient);
    const httpTesting = TestBed.inject(HttpTestingController);

    http.get('/api/productos').subscribe();

    const request = httpTesting.expectOne('/api/productos');
    expect(request.request.headers.get('Authorization')).toBe('Bearer signed-token');
    request.flush({});
    httpTesting.verify();
  });
});
