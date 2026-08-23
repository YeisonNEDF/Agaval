import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { InventoryMovement } from '../../models/inventory-movement.model';

@Component({
  selector: 'app-movement-list',
  standalone: true,
  imports: [DatePipe, MatIconModule, MatPaginatorModule, MatTableModule],
  templateUrl: './movement-list.html',
  styleUrl: './movement-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementListComponent {
  readonly movements = input.required<readonly InventoryMovement[]>();
  readonly totalCount = input.required<number>();
  readonly pageNumber = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly pageChanged = output<PageEvent>();
  readonly displayedColumns = ['date', 'product', 'type', 'quantity', 'observation'];
}
