import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CategoryFormComponent, CategoryFormDialogData } from './category-form';

describe('CategoryFormComponent', () => {
  let fixture: ComponentFixture<CategoryFormComponent>;
  let closeSpy: jasmine.Spy;

  beforeEach(async () => {
    closeSpy = jasmine.createSpy('close');
    const data: CategoryFormDialogData = { category: null };
    await TestBed.configureTestingModule({
      imports: [CategoryFormComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: closeSpy } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryFormComponent);
  });

  it('rejects an empty category name', () => {
    fixture.componentInstance.save();

    expect(closeSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.controls.name.touched).toBeTrue();
  });

  it('returns a normalized typed payload', () => {
    fixture.componentInstance.form.setValue({ name: '  Ferretería  ', isActive: true });

    fixture.componentInstance.save();

    expect(closeSpy).toHaveBeenCalledOnceWith({ name: 'Ferretería', isActive: true });
  });
});
