import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryMovementsStore } from '../../services/inventory-movements.store';
import { InventoryMovementsPageComponent } from './inventory-movements-page';

describe('InventoryMovementsPageComponent', () => {
  let fixture: ComponentFixture<InventoryMovementsPageComponent>;
  let loadSpy: jasmine.Spy;
  let setFiltersSpy: jasmine.Spy;
  let setPageSpy: jasmine.Spy;

  beforeEach(async () => {
    loadSpy = jasmine.createSpy('load').and.resolveTo();
    setFiltersSpy = jasmine.createSpy('setFilters').and.resolveTo();
    setPageSpy = jasmine.createSpy('setPage').and.resolveTo();
    await TestBed.configureTestingModule({
      imports: [InventoryMovementsPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: InventoryMovementsStore,
          useValue: {
            movements: signal([]),
            products: signal([]),
            query: signal({ productId: null, type: null, pageNumber: 1, pageSize: 10 }),
            totalCount: signal(0),
            loading: signal(false),
            error: signal(null),
            load: loadSpy,
            setFilters: setFiltersSpy,
            setPage: setPageSpy,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryMovementsPageComponent);
    await fixture.whenStable();
  });

  it('loads and renders the movement history', () => {
    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Movimientos de inventario',
    );
  });

  it('delegates page changes to its feature store', () => {
    fixture.componentInstance.setPage({ pageIndex: 2, pageSize: 25, length: 100 });

    expect(setPageSpy).toHaveBeenCalledOnceWith(2, 25);
  });
});
