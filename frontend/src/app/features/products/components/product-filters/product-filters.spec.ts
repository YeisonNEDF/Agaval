import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductFiltersComponent } from './product-filters';

describe('ProductFiltersComponent', () => {
  let fixture: ComponentFixture<ProductFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFiltersComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductFiltersComponent);
    fixture.componentRef.setInput('categories', [
      { id: 1, name: 'Electrónica', isActive: true },
    ]);
    fixture.componentRef.setInput('filters', { categoryId: null, stock: 'all', search: '' });
    await fixture.whenStable();
  });

  it('emits an immutable filter value when category changes', () => {
    const emitted: unknown[] = [];
    fixture.componentInstance.filtersChanged.subscribe((filters) => emitted.push(filters));

    fixture.componentInstance.changeCategory(1);

    expect(emitted).toEqual([{ categoryId: 1, stock: 'all', search: '' }]);
  });
});
