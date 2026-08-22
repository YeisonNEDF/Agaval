import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Category } from '../../models/category.model';
import { ProductFilters, StockFilter } from '../../models/product.model';

@Component({
  selector: 'app-product-filters',
  standalone: true,
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatSelectModule],
  templateUrl: './product-filters.html',
  styleUrl: './product-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFiltersComponent {
  readonly categories = input.required<readonly Category[]>();
  readonly filters = input.required<ProductFilters>();
  readonly filtersChanged = output<ProductFilters>();
  readonly cleared = output<void>();

  changeCategory(categoryId: number | null): void {
    this.filtersChanged.emit({ ...this.filters(), categoryId });
  }

  changeStock(stock: StockFilter): void {
    this.filtersChanged.emit({ ...this.filters(), stock });
  }
}
