import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../core/models/api-error.model';
import {
  DEFAULT_MOVEMENT_QUERY,
  InventoryMovement,
  InventoryMovementFilters,
  InventoryMovementQuery,
  MovementProductOption,
} from '../models/inventory-movement.model';
import { InventoryMovementsApiService } from './inventory-movements-api.service';

@Injectable()
export class InventoryMovementsStore {
  private readonly movementsApi = inject(InventoryMovementsApiService);
  private readonly movementsState = signal<readonly InventoryMovement[]>([]);
  private readonly productsState = signal<readonly MovementProductOption[]>([]);
  private readonly queryState = signal<InventoryMovementQuery>(DEFAULT_MOVEMENT_QUERY);
  private readonly totalCountState = signal(0);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly movements = this.movementsState.asReadonly();
  readonly products = this.productsState.asReadonly();
  readonly query = this.queryState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const query = this.queryState();
      const productsRequest =
        this.productsState().length === 0
          ? firstValueFrom(this.movementsApi.listProducts())
          : Promise.resolve(null);
      const [page, productsPage] = await Promise.all([
        firstValueFrom(this.movementsApi.list(query)),
        productsRequest,
      ]);

      this.movementsState.set(page.items);
      this.totalCountState.set(page.totalCount);
      if (productsPage !== null) {
        this.productsState.set(productsPage.items);
      }
    } catch (error: unknown) {
      this.errorState.set(
        error instanceof ApiError ? error.message : 'No fue posible consultar los movimientos.',
      );
    } finally {
      this.loadingState.set(false);
    }
  }

  async setFilters(filters: InventoryMovementFilters): Promise<void> {
    this.queryState.update((query) => ({ ...query, ...filters, pageNumber: 1 }));
    await this.load();
  }

  async setPage(pageIndex: number, pageSize: number): Promise<void> {
    this.queryState.update((query) => ({ ...query, pageNumber: pageIndex + 1, pageSize }));
    await this.load();
  }
}
