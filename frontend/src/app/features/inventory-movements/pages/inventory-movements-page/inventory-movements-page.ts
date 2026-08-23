import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { MovementFiltersComponent } from '../../components/movement-filters/movement-filters';
import { MovementListComponent } from '../../components/movement-list/movement-list';
import { InventoryMovementFilters } from '../../models/inventory-movement.model';
import { InventoryMovementsStore } from '../../services/inventory-movements.store';

@Component({
  selector: 'app-inventory-movements-page',
  standalone: true,
  imports: [
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MovementFiltersComponent,
    MovementListComponent,
    PageHeaderComponent,
  ],
  templateUrl: './inventory-movements-page.html',
  styleUrl: './inventory-movements-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryMovementsPageComponent {
  readonly store = inject(InventoryMovementsStore);

  constructor() {
    void this.store.load();
  }

  setFilters(filters: InventoryMovementFilters): void {
    void this.store.setFilters(filters);
  }

  setPage(event: PageEvent): void {
    void this.store.setPage(event.pageIndex, event.pageSize);
  }
}
