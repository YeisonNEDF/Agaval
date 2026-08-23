import { Routes } from '@angular/router';
import { authenticationGuard, guestGuard } from './core/authentication/authentication.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'productos',
  },
  {
    path: 'productos',
    canActivate: [authenticationGuard],
    loadChildren: () =>
      import('./features/products/routes').then((routesModule) => routesModule.PRODUCT_ROUTES),
  },
  {
    path: 'categorias',
    canActivate: [authenticationGuard],
    loadChildren: () =>
      import('./features/categories/routes').then((routesModule) => routesModule.CATEGORY_ROUTES),
  },
  {
    path: 'movimientos',
    canActivate: [authenticationGuard],
    loadChildren: () =>
      import('./features/inventory-movements/routes').then(
        (routesModule) => routesModule.INVENTORY_MOVEMENT_ROUTES,
      ),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/authentication/pages/login-page/login-page').then(
        (pageModule) => pageModule.LoginPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'productos',
  },
];
