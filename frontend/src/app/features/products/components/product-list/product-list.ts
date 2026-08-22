import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, MatTableModule, MatTooltipModule],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent {
  readonly products = input.required<readonly Product[]>();
  readonly editRequested = output<Product>();
  readonly stockAdjustmentRequested = output<Product>();
  readonly deleteRequested = output<Product>();

  readonly displayedColumns = ['product', 'category', 'price', 'stock', 'status', 'actions'];
}
