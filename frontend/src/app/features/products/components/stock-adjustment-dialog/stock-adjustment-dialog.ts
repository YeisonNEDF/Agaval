import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { Product } from '../../models/product.model';
import {
  StockAdjustmentPayload,
  StockMovementType,
} from '../../models/stock-adjustment.model';

export interface StockAdjustmentDialogData {
  readonly product: Product;
}

interface StockAdjustmentControls {
  readonly type: FormControl<StockMovementType>;
  readonly quantity: FormControl<number>;
  readonly observation: FormControl<string | null>;
}

@Component({
  selector: 'app-stock-adjustment-dialog',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    ReactiveFormsModule,
  ],
  templateUrl: './stock-adjustment-dialog.html',
  styleUrl: './stock-adjustment-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAdjustmentDialogComponent {
  readonly data = inject<StockAdjustmentDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<StockAdjustmentDialogComponent, StockAdjustmentPayload | undefined>,
  );

  readonly form = new FormGroup<StockAdjustmentControls>({
    type: new FormControl<StockMovementType>('Entry', { nonNullable: true }),
    quantity: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    observation: new FormControl<string | null>(null, [Validators.maxLength(255)]),
  });

  private readonly movementType = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });
  private readonly quantity = toSignal(this.form.controls.quantity.valueChanges, {
    initialValue: this.form.controls.quantity.value,
  });

  readonly resultingStock = computed(() =>
    this.movementType() === 'Entry'
      ? this.data.product.stock + this.quantity()
      : this.data.product.stock - this.quantity(),
  );

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    const quantityControl = this.form.controls.quantity;
    const value = this.form.getRawValue();

    if (value.type === 'Exit' && value.quantity > this.data.product.stock) {
      quantityControl.setErrors({ ...quantityControl.errors, exceedsStock: true });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const normalizedObservation = value.observation?.trim();
    this.dialogRef.close({
      ...value,
      observation: normalizedObservation ? normalizedObservation : null,
    });
  }
}
