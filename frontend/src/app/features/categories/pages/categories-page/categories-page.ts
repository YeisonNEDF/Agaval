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
import {
  CategoryFormComponent,
  CategoryFormDialogData,
} from '../../components/category-form/category-form';
import { CategoryListComponent } from '../../components/category-list/category-list';
import { ManagedCategory } from '../../models/category.model';
import { CategoriesStore } from '../../services/categories.store';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [
    CategoryListComponent,
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
  ],
  templateUrl: './categories-page.html',
  styleUrl: './categories-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPageComponent {
  readonly store = inject(CategoriesStore);
  private readonly dialog = inject(MatDialog);

  constructor() {
    void this.store.load();
  }

  async openForm(category: ManagedCategory | null): Promise<void> {
    const data: CategoryFormDialogData = { category };
    const dialogRef = this.dialog.open(CategoryFormComponent, {
      data,
      width: '32rem',
      maxWidth: 'calc(100vw - 2rem)',
      panelClass: 'category-form-dialog',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
    const payload = await firstValueFrom(dialogRef.afterClosed());
    if (!payload) {
      return;
    }

    if (category === null) {
      await this.store.create({ name: payload.name });
    } else {
      await this.store.update(category.id, payload);
    }
  }

  async confirmDelete(category: ManagedCategory): Promise<void> {
    const data: ConfirmDialogData = {
      title: 'Eliminar categoría',
      message: `Se eliminará “${category.name}”. Si tiene productos asociados, la operación será rechazada para proteger la integridad del inventario.`,
      confirmLabel: 'Eliminar categoría',
    };
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data,
      width: '29rem',
      maxWidth: 'calc(100vw - 2rem)',
      restoreFocus: true,
    });

    if (await firstValueFrom(dialogRef.afterClosed())) {
      await this.store.delete(category.id);
    }
  }
}
