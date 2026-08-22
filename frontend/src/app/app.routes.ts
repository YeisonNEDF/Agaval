import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'productos',
  },
  {
    path: 'productos',
    loadChildren: () =>
      import('./features/products/routes').then((routesModule) => routesModule.PRODUCT_ROUTES),
  },
  {
    path: '**',
    redirectTo: 'productos',
  },
];
