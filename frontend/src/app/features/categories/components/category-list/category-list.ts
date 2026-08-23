import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ManagedCategory } from '../../models/category.model';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTableModule, MatTooltipModule],
  templateUrl: './category-list.html',
  styleUrl: './category-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryListComponent {
  readonly categories = input.required<readonly ManagedCategory[]>();
  readonly saving = input(false);
  readonly editRequested = output<ManagedCategory>();
  readonly deactivateRequested = output<ManagedCategory>();
  readonly displayedColumns = ['category', 'status', 'actions'];
}
