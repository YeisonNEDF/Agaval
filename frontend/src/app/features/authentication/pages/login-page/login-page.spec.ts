import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthenticationStore } from '../../../../core/authentication/authentication.store';
import { LoginPageComponent } from './login-page';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let loginSpy: jasmine.Spy;
  let router: Router;

  beforeEach(async () => {
    loginSpy = jasmine.createSpy('login').and.resolveTo(true);
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthenticationStore,
          useValue: { loading: signal(false), error: signal(null), login: loginSpy },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  it('does not call the API while the form is invalid', async () => {
    await fixture.componentInstance.submit();

    expect(loginSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.controls.username.touched).toBeTrue();
  });

  it('authenticates and navigates to products with valid credentials', async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.componentInstance.form.setValue({
      username: 'admin',
      password: 'Agaval_admin_2026!',
    });

    await fixture.componentInstance.submit();

    expect(loginSpy).toHaveBeenCalledOnceWith({
      username: 'admin',
      password: 'Agaval_admin_2026!',
    });
    expect(navigateSpy).toHaveBeenCalledOnceWith('/productos');
  });
});
