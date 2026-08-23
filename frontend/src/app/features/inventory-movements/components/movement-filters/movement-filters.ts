import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import {
  InventoryMovementFilters,
  InventoryMovementQuery,
  MovementProductOption,
  StockMovementType,
} from '../../models/inventory-movement.model';

@Component({
  selector: 'app-movement-filters',
  standalone: true,
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatSelectModule],
  templateUrl: './movement-filters.html',
  styleUrl: './movement-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementFiltersComponent {
  readonly products = input.required<readonly MovementProductOption[]>();
  readonly query = input.required<InventoryMovementQuery>();
  readonly filtersChanged = output<InventoryMovementFilters>();

  changeProduct(productId: number | null): void {
    this.emit(productId, this.query().type);
  }

  changeType(type: StockMovementType | null): void {
    this.emit(this.query().productId, type);
  }

  clear(): void {
    this.emit(null, null);
  }

  private emit(productId: number | null, type: StockMovementType | null): void {
    this.filtersChanged.emit({ productId, type });
  }
}
