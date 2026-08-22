import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
import { Product, ProductFilters, StockFilter } from '../../models/product.model';
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
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isLowStockView = computed(() => this.store.filters().stock === 'low');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.store.setFilters(this.readFiltersFromRoute(params));
    });

    void this.store.load();
  }

  setFilters(filters: ProductFilters): void {
    const commands = filters.stock === 'low' ? ['/productos/stock-bajo'] : ['/productos'];
    const queryParams: Params = {};

    if (filters.categoryId !== null) {
      queryParams['categoriaId'] = filters.categoryId;
    }

    if (filters.stock === 'normal') {
      queryParams['stock'] = filters.stock;
    }

    void this.router.navigate(commands, { queryParams });
  }

  clearFilters(): void {
    void this.router.navigate(['/productos']);
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

  private readFiltersFromRoute(params: ParamMap): ProductFilters {
    const categoryId = parsePositiveInteger(params.get('categoriaId'));
    const routeStock: StockFilter =
      this.route.snapshot.routeConfig?.path === 'stock-bajo'
        ? 'low'
        : parseStockFilter(params.get('stock'));

    return { categoryId, stock: routeStock };
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
