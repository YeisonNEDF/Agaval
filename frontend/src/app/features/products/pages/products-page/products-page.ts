import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
import { Product } from '../../models/product.model';
import { ProductsStore } from '../../services/products.store';

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
  ],
  templateUrl: './products-page.html',
  styleUrl: './products-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPageComponent {
  readonly store = inject(ProductsStore);
  private readonly dialog = inject(MatDialog);

  constructor() {
    void this.store.load();
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
    const dialogRef = this.dialog.open(ConfirmDialogComponent, { data, restoreFocus: true });
    const confirmed = await firstValueFrom(dialogRef.afterClosed());

    if (confirmed) {
      await this.store.delete(product.id);
    }
  }
}
