import { Routes } from '@angular/router';
import { CategoriesManagementApiService } from './services/categories-api.service';
import { CategoriesStore } from './services/categories.store';

export const CATEGORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/categories-page/categories-page').then(
        (pageModule) => pageModule.CategoriesPageComponent,
      ),
    providers: [CategoriesManagementApiService, CategoriesStore],
  },
];
