import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MovementFiltersComponent } from './movement-filters';

describe('MovementFiltersComponent', () => {
  let fixture: ComponentFixture<MovementFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovementFiltersComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(MovementFiltersComponent);
    fixture.componentRef.setInput('products', [{ id: 1, name: 'Monitor' }]);
    fixture.componentRef.setInput('query', {
      productId: 1,
      type: 'Entry',
      pageNumber: 2,
      pageSize: 10,
    });
    await fixture.whenStable();
  });

  it('renders available product filters', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Monitor');
  });

  it('emits a complete reset', () => {
    const emitted: unknown[] = [];
    fixture.componentInstance.filtersChanged.subscribe((filters) => emitted.push(filters));

    fixture.componentInstance.clear();

    expect(emitted).toEqual([{ productId: null, type: null }]);
  });
});
