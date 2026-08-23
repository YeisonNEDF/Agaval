import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  Product,
  ProductSortField,
  SortDirection as ProductSortDirection,
} from '../../models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent {
  readonly products = input.required<readonly Product[]>();
  readonly totalCount = input.required<number>();
  readonly pageNumber = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly sortBy = input.required<ProductSortField>();
  readonly sortDirection = input.required<ProductSortDirection>();
  readonly canManage = input(false);
  readonly editRequested = output<Product>();
  readonly stockAdjustmentRequested = output<Product>();
  readonly deleteRequested = output<Product>();
  readonly pageChanged = output<PageEvent>();
  readonly sortChanged = output<Sort>();

  readonly displayedColumns = ['product', 'category', 'price', 'stock', 'status', 'actions'];
}
