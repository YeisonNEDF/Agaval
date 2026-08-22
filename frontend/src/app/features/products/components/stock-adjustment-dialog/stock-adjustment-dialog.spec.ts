import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { StockAdjustmentDialogComponent, StockAdjustmentDialogData } from './stock-adjustment-dialog';

describe('StockAdjustmentDialogComponent', () => {
  let fixture: ComponentFixture<StockAdjustmentDialogComponent>;
  let closeSpy: jasmine.Spy;

  beforeEach(async () => {
    closeSpy = jasmine.createSpy('close');
    const data: StockAdjustmentDialogData = {
      product: {
        id: 1,
        name: 'Teclado',
        description: null,
        price: 200000,
        stock: 4,
        minimumStock: 2,
        isLowStock: false,
        categoryId: 1,
        categoryName: 'Electrónica',
        createdAt: '2026-08-22T00:00:00Z',
      },
    };

    await TestBed.configureTestingModule({
      imports: [StockAdjustmentDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: closeSpy } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockAdjustmentDialogComponent);
  });

  it('rejects an exit greater than available stock', () => {
    fixture.componentInstance.form.patchValue({ type: 'Exit', quantity: 5 });

    fixture.componentInstance.submit();

    expect(fixture.componentInstance.form.controls.quantity.hasError('exceedsStock')).toBeTrue();
    expect(closeSpy).not.toHaveBeenCalled();
  });
});
