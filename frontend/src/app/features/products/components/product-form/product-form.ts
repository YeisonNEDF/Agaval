import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Category } from '../../models/category.model';
import { Product, ProductUpsertPayload } from '../../models/product.model';

export interface ProductFormDialogData {
  readonly product: Product | null;
  readonly categories: readonly Category[];
}

interface ProductFormControls {
  readonly name: FormControl<string>;
  readonly description: FormControl<string | null>;
  readonly price: FormControl<number>;
  readonly stock: FormControl<number>;
  readonly minimumStock: FormControl<number>;
  readonly categoryId: FormControl<number>;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent {
  readonly data = inject<ProductFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<ProductFormComponent, ProductUpsertPayload | undefined>,
  );

  readonly title = this.data.product ? 'Editar producto' : 'Nuevo producto';
  readonly submitLabel = this.data.product ? 'Guardar cambios' : 'Crear producto';
  readonly form = new FormGroup<ProductFormControls>({
    name: new FormControl(this.data.product?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    description: new FormControl(this.data.product?.description ?? null, [Validators.maxLength(500)]),
    price: new FormControl(this.data.product?.price ?? 0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01), Validators.max(99_999_999.99)],
    }),
    stock: new FormControl(this.data.product?.stock ?? 0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    minimumStock: new FormControl(this.data.product?.minimumStock ?? 5, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    categoryId: new FormControl(
      this.data.product?.categoryId ?? this.data.categories.at(0)?.id ?? 0,
      {
        nonNullable: true,
        validators: [Validators.required, Validators.min(1)],
      },
    ),
  });

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const normalizedDescription = value.description?.trim();

    this.dialogRef.close({
      ...value,
      name: value.name.trim(),
      description: normalizedDescription ? normalizedDescription : null,
    });
  }
}
