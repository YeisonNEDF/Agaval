import { Routes } from '@angular/router';
import { CategoriesApiService } from './services/categories-api.service';
import { ProductsApiService } from './services/products-api.service';
import { ProductsStore } from './services/products.store';

export const PRODUCT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/products-page/products-page').then(
        (pageModule) => pageModule.ProductsPageComponent,
      ),
    providers: [ProductsApiService, CategoriesApiService, ProductsStore],
  },
];
