import { Routes } from '@angular/router';
import { CategoriesApiService } from './services/categories-api.service';
import { ProductsApiService } from './services/products-api.service';
import { ProductsStore } from './services/products.store';

const loadProductsPage = () =>
  import('./pages/products-page/products-page').then(
    (pageModule) => pageModule.ProductsPageComponent,
  );

const productProviders = [ProductsApiService, CategoriesApiService, ProductsStore];

export const PRODUCT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: loadProductsPage,
    providers: productProviders,
  },
  {
    path: 'stock-bajo',
    loadComponent: loadProductsPage,
    providers: productProviders,
  },
];
