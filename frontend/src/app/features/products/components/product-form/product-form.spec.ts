import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ProductFormComponent, ProductFormDialogData } from './product-form';

describe('ProductFormComponent', () => {
  let fixture: ComponentFixture<ProductFormComponent>;
  let closeSpy: jasmine.Spy;

  beforeEach(async () => {
    closeSpy = jasmine.createSpy('close');
    const data: ProductFormDialogData = {
      product: null,
      categories: [{ id: 1, name: 'Electrónica', isActive: true }],
    };

    await TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: closeSpy } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductFormComponent);
  });

  it('does not submit an invalid product', () => {
    fixture.componentInstance.submit();

    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('returns a typed payload when the form is valid', () => {
    fixture.componentInstance.form.patchValue({
      name: 'Mouse',
      description: 'Ergonómico',
      price: 120000,
      stock: 4,
      minimumStock: 2,
      categoryId: 1,
    });

    fixture.componentInstance.submit();

    expect(closeSpy).toHaveBeenCalledOnceWith({
      name: 'Mouse',
      description: 'Ergonómico',
      price: 120000,
      stock: 4,
      minimumStock: 2,
      categoryId: 1,
    });
  });
});
