import { Routes } from '@angular/router';
import { InventoryMovementsApiService } from './services/inventory-movements-api.service';
import { InventoryMovementsStore } from './services/inventory-movements.store';

export const INVENTORY_MOVEMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/inventory-movements-page/inventory-movements-page').then(
        (pageModule) => pageModule.InventoryMovementsPageComponent,
      ),
    providers: [InventoryMovementsApiService, InventoryMovementsStore],
  },
];
