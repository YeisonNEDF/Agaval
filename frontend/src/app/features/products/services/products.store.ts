import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../core/models/api-error.model';
import { NotificationService } from '../../../core/services/notification.service';
import { Category } from '../models/category.model';
import {
  DEFAULT_PRODUCT_FILTERS,
  Product,
  ProductFilters,
  ProductUpsertPayload,
} from '../models/product.model';
import { StockAdjustmentPayload } from '../models/stock-adjustment.model';
import { CategoriesApiService } from './categories-api.service';
import { ProductsApiService } from './products-api.service';

@Injectable()
export class ProductsStore {
  private readonly productsApi = inject(ProductsApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly notifications = inject(NotificationService);

  private readonly productsState = signal<readonly Product[]>([]);
  private readonly categoriesState = signal<readonly Category[]>([]);
  private readonly filtersState = signal<ProductFilters>(DEFAULT_PRODUCT_FILTERS);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly products = this.productsState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly filters = this.filtersState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly filteredProducts = computed(() => {
    const filters = this.filtersState();

    return this.productsState().filter((product) => {
      const matchesCategory =
        filters.categoryId === null || product.categoryId === filters.categoryId;
      const matchesStock =
        filters.stock === 'all' ||
        (filters.stock === 'low' && product.isLowStock) ||
        (filters.stock === 'normal' && !product.isLowStock);

      return matchesCategory && matchesStock;
    });
  });

  readonly totalProducts = computed(() => this.productsState().length);
  readonly lowStockCount = computed(
    () => this.productsState().filter((product) => product.isLowStock).length,
  );
  readonly inventoryValue = computed(() =>
    this.productsState().reduce((total, product) => total + product.price * product.stock, 0),
  );
  readonly hasActiveFilters = computed(() => {
    const filters = this.filtersState();
    return filters.categoryId !== null || filters.stock !== 'all';
  });

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const [products, categories] = await Promise.all([
        firstValueFrom(this.productsApi.list()),
        firstValueFrom(this.categoriesApi.listActive()),
      ]);

      this.productsState.set(sortProducts(products));
      this.categoriesState.set(categories);
    } catch (error: unknown) {
      this.errorState.set(messageFromError(error));
    } finally {
      this.loadingState.set(false);
    }
  }

  setFilters(filters: ProductFilters): void {
    this.filtersState.set(filters);
  }

  clearFilters(): void {
    this.filtersState.set(DEFAULT_PRODUCT_FILTERS);
  }

  async create(payload: ProductUpsertPayload): Promise<boolean> {
    return this.executeMutation(
      () => firstValueFrom(this.productsApi.create(payload)),
      (createdProduct) => this.upsertProduct(createdProduct),
      'Producto creado correctamente.',
    );
  }

  async update(id: number, payload: ProductUpsertPayload): Promise<boolean> {
    return this.executeMutation(
      () => firstValueFrom(this.productsApi.update(id, payload)),
      (updatedProduct) => this.upsertProduct(updatedProduct),
      'Producto actualizado correctamente.',
    );
  }

  async adjustStock(id: number, payload: StockAdjustmentPayload): Promise<boolean> {
    return this.executeMutation(
      () => firstValueFrom(this.productsApi.adjustStock(id, payload)),
      (updatedProduct) => this.upsertProduct(updatedProduct),
      'Stock ajustado correctamente.',
    );
  }

  async delete(id: number): Promise<boolean> {
    this.savingState.set(true);

    try {
      await firstValueFrom(this.productsApi.delete(id));
      this.productsState.update((products) => products.filter((product) => product.id !== id));
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
    onSuccess: (product: Product) => void,
    successMessage: string,
  ): Promise<boolean> {
    this.savingState.set(true);

    try {
      const product = await request();
      onSuccess(product);
      this.notifications.success(successMessage);
      return true;
    } catch (error: unknown) {
      this.notifications.error(messageFromError(error));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  private upsertProduct(product: Product): void {
    this.productsState.update((products) =>
      sortProducts([...products.filter((item) => item.id !== product.id), product]),
    );
  }
}

function sortProducts(products: readonly Product[]): readonly Product[] {
  return [...products].sort((left, right) =>
    left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }),
  );
}

function messageFromError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'La operación no pudo completarse. Inténtelo nuevamente.';
}
