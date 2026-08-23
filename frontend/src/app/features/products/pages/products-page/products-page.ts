import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthenticationStore } from '../../../../core/authentication/authentication.store';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Sort } from '@angular/material/sort';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { ProductFiltersComponent } from '../../components/product-filters/product-filters';
import {
  ProductFormComponent,
  ProductFormDialogData,
} from '../../components/product-form/product-form';
import { ProductListComponent } from '../../components/product-list/product-list';
import {
  StockAdjustmentDialogComponent,
  StockAdjustmentDialogData,
} from '../../components/stock-adjustment-dialog/stock-adjustment-dialog';
import {
  Product,
  ProductFilters,
  ProductQuery,
  ProductSortField,
  SortDirection,
  StockFilter,
} from '../../models/product.model';
import { ProductsStore } from '../../services/products.store';

const PRODUCT_FORM_DIALOG_LAYOUT = {
  width: '44rem',
  maxWidth: 'calc(100vw - 2rem)',
  maxHeight: 'calc(100dvh - 2rem)',
  panelClass: 'product-form-dialog',
} as const;

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [
    CurrencyPipe,
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    ProductFiltersComponent,
    ProductListComponent,
    RouterLink,
  ],
  templateUrl: './products-page.html',
  styleUrl: './products-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPageComponent {
  readonly store = inject(ProductsStore);
  readonly authentication = inject(AuthenticationStore);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isLowStockView = computed(() => this.store.filters().stock === 'low');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.store.setQuery(this.readQueryFromRoute(params));
      void this.store.load();
    });
  }

  setFilters(filters: ProductFilters): void {
    this.navigateToQuery({ ...this.store.query(), ...filters, pageNumber: 1 });
  }

  clearFilters(): void {
    const query = this.store.query();
    this.navigateToQuery({
      ...query,
      categoryId: null,
      stock: 'all',
      search: '',
      pageNumber: 1,
    });
  }

  setPage(event: PageEvent): void {
    this.navigateToQuery({
      ...this.store.query(),
      pageNumber: event.pageIndex + 1,
      pageSize: event.pageSize,
    });
  }

  setSort(sort: Sort): void {
    if (!isProductSortField(sort.active)) {
      return;
    }

    const sortDirection: SortDirection = sort.direction === 'desc' ? 'Descending' : 'Ascending';
    this.navigateToQuery({
      ...this.store.query(),
      sortBy: sort.active,
      sortDirection,
      pageNumber: 1,
    });
  }

  async openCreateDialog(): Promise<void> {
    const data: ProductFormDialogData = {
      product: null,
      categories: this.store.categories(),
    };
    const dialogRef = this.dialog.open(ProductFormComponent, {
      data,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      ...PRODUCT_FORM_DIALOG_LAYOUT,
    });
    const payload = await firstValueFrom(dialogRef.afterClosed());

    if (payload) {
      await this.store.create(payload);
    }
  }

  async openEditDialog(product: Product): Promise<void> {
    const data: ProductFormDialogData = {
      product,
      categories: this.store.categories(),
    };
    const dialogRef = this.dialog.open(ProductFormComponent, {
      data,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      ...PRODUCT_FORM_DIALOG_LAYOUT,
    });
    const payload = await firstValueFrom(dialogRef.afterClosed());

    if (payload) {
      await this.store.update(product.id, payload);
    }
  }

  async openStockDialog(product: Product): Promise<void> {
    const data: StockAdjustmentDialogData = { product };
    const dialogRef = this.dialog.open(StockAdjustmentDialogComponent, {
      data,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      width: '34rem',
      maxWidth: 'calc(100vw - 2rem)',
      maxHeight: 'calc(100dvh - 2rem)',
      panelClass: 'stock-adjustment-dialog',
    });
    const payload = await firstValueFrom(dialogRef.afterClosed());

    if (payload) {
      await this.store.adjustStock(product.id, payload);
    }
  }

  async confirmDelete(product: Product): Promise<void> {
    const data: ConfirmDialogData = {
      title: 'Eliminar producto',
      message: `Se eliminará “${product.name}” y su historial de movimientos. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar producto',
    };
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data,
      restoreFocus: true,
      width: '28rem',
      maxWidth: 'calc(100vw - 2rem)',
      panelClass: 'confirm-product-dialog',
    });
    const confirmed = await firstValueFrom(dialogRef.afterClosed());

    if (confirmed) {
      await this.store.delete(product.id);
    }
  }

  private navigateToQuery(query: ProductQuery): void {
    const commands = query.stock === 'low' ? ['/productos/stock-bajo'] : ['/productos'];
    const queryParams: Params = {};

    if (query.categoryId !== null) {
      queryParams['categoriaId'] = query.categoryId;
    }
    if (query.stock === 'normal') {
      queryParams['stock'] = query.stock;
    }
    if (query.search.length > 0) {
      queryParams['buscar'] = query.search;
    }
    if (query.pageNumber > 1) {
      queryParams['pagina'] = query.pageNumber;
    }
    if (query.pageSize !== 10) {
      queryParams['tamano'] = query.pageSize;
    }
    if (query.sortBy !== 'Name') {
      queryParams['ordenarPor'] = query.sortBy;
    }
    if (query.sortDirection !== 'Ascending') {
      queryParams['direccion'] = query.sortDirection;
    }

    void this.router.navigate(commands, { queryParams });
  }

  private readQueryFromRoute(params: ParamMap): ProductQuery {
    const categoryId = parsePositiveInteger(params.get('categoriaId'));
    const routeStock: StockFilter =
      this.route.snapshot.routeConfig?.path === 'stock-bajo'
        ? 'low'
        : parseStockFilter(params.get('stock'));

    return {
      categoryId,
      stock: routeStock,
      search: (params.get('buscar') ?? '').slice(0, 150),
      pageNumber: parsePositiveInteger(params.get('pagina')) ?? 1,
      pageSize: parsePageSize(params.get('tamano')),
      sortBy: parseProductSortField(params.get('ordenarPor')),
      sortDirection: parseSortDirection(params.get('direccion')),
    };
  }
}

function parsePositiveInteger(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function parseStockFilter(value: string | null): StockFilter {
  return value === 'low' || value === 'normal' ? value : 'all';
}

function parsePageSize(value: string | null): number {
  const parsedValue = Number(value);
  return [5, 10, 25, 50, 100].includes(parsedValue) ? parsedValue : 10;
}

function isProductSortField(value: string): value is ProductSortField {
  return ['Name', 'Category', 'Price', 'Stock', 'CreatedAt'].includes(value);
}

function parseProductSortField(value: string | null): ProductSortField {
  return value !== null && isProductSortField(value) ? value : 'Name';
}

function parseSortDirection(value: string | null): SortDirection {
  return value === 'Descending' ? value : 'Ascending';
}
