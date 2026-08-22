import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let closeSpy: jasmine.Spy;

  beforeEach(async () => {
    closeSpy = jasmine.createSpy('close');
    const data: ConfirmDialogData = {
      title: 'Eliminar producto',
      message: 'Esta operación no se puede deshacer.',
      confirmLabel: 'Eliminar',
    };

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: closeSpy } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
  });

  it('returns true when the user confirms', () => {
    fixture.componentInstance.confirm();

    expect(closeSpy).toHaveBeenCalledOnceWith(true);
  });
});
