import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../core/models/api-error.model';
import { NotificationService } from '../../../core/services/notification.service';
import { Category } from '../models/category.model';
import {
  DEFAULT_PRODUCT_QUERY,
  InventorySummary,
  Product,
  ProductQuery,
  ProductUpsertPayload,
} from '../models/product.model';
import { StockAdjustmentPayload } from '../models/stock-adjustment.model';
import { CategoriesApiService } from './categories-api.service';
import { ProductsApiService } from './products-api.service';

const EMPTY_SUMMARY: InventorySummary = {
  totalProducts: 0,
  lowStockProducts: 0,
  inventoryValue: 0,
};

@Injectable()
export class ProductsStore {
  private readonly productsApi = inject(ProductsApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly notifications = inject(NotificationService);
  private readonly productsState = signal<readonly Product[]>([]);
  private readonly categoriesState = signal<readonly Category[]>([]);
  private readonly queryState = signal<ProductQuery>(DEFAULT_PRODUCT_QUERY);
  private readonly summaryState = signal<InventorySummary>(EMPTY_SUMMARY);
  private readonly totalCountState = signal(0);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly products = this.productsState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly query = this.queryState.asReadonly();
  readonly filters = computed(() => {
    const query = this.queryState();
    return { categoryId: query.categoryId, stock: query.stock, search: query.search };
  });
  readonly summary = this.summaryState.asReadonly();
  readonly totalCount = this.totalCountState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly totalProducts = computed(() => this.summaryState().totalProducts);
  readonly lowStockCount = computed(() => this.summaryState().lowStockProducts);
  readonly inventoryValue = computed(() => this.summaryState().inventoryValue);
  readonly hasActiveFilters = computed(() => {
    const query = this.queryState();
    return query.categoryId !== null || query.stock !== 'all' || query.search.length > 0;
  });

  setQuery(query: ProductQuery): void {
    this.queryState.set(query);
  }

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const categoriesRequest =
        this.categoriesState().length === 0
          ? firstValueFrom(this.categoriesApi.listActive())
          : Promise.resolve(null);
      const [page, categories, summary] = await Promise.all([
        firstValueFrom(this.productsApi.list(this.queryState())),
        categoriesRequest,
        firstValueFrom(this.productsApi.getSummary()),
      ]);

      this.productsState.set(page.items);
      this.totalCountState.set(page.totalCount);
      this.summaryState.set(summary);
      if (categories !== null) {
        this.categoriesState.set(categories);
      }
    } catch (error: unknown) {
      this.errorState.set(messageFromError(error));
    } finally {
      this.loadingState.set(false);
    }
  }

  async create(payload: ProductUpsertPayload): Promise<boolean> {
    return this.executeMutation(
      () => firstValueFrom(this.productsApi.create(payload)),
      'Producto creado correctamente.',
    );
  }

  async update(id: number, payload: ProductUpsertPayload): Promise<boolean> {
    return this.executeMutation(
      () => firstValueFrom(this.productsApi.update(id, payload)),
      'Producto actualizado correctamente.',
    );
  }

  async adjustStock(id: number, payload: StockAdjustmentPayload): Promise<boolean> {
    return this.executeMutation(
      () => firstValueFrom(this.productsApi.adjustStock(id, payload)),
      'Stock ajustado correctamente.',
    );
  }

  async delete(id: number): Promise<boolean> {
    this.savingState.set(true);

    try {
      await firstValueFrom(this.productsApi.delete(id));
      await this.load();
      this.notifications.success('Producto eliminado correctamente.');
      return true;
    } catch (error: unknown) {
      this.notifications.error(messageFromError(error));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  private async executeMutation(
    request: () => Promise<Product>,
    successMessage: string,
  ): Promise<boolean> {
    this.savingState.set(true);

    try {
      await request();
      await this.load();
      this.notifications.success(successMessage);
      return true;
    } catch (error: unknown) {
      this.notifications.error(messageFromError(error));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }
}

function messageFromError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'La operación no pudo completarse. Inténtelo nuevamente.';
}
