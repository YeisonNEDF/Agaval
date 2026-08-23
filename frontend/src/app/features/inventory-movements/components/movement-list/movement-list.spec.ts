import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MovementListComponent } from './movement-list';

describe('MovementListComponent', () => {
  let fixture: ComponentFixture<MovementListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovementListComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(MovementListComponent);
    fixture.componentRef.setInput('movements', [
      {
        id: 1,
        productId: 4,
        productName: 'Monitor',
        type: 'Entry',
        quantity: 3,
        occurredAt: '2026-08-22T20:00:00Z',
        observation: 'Reposición',
      },
    ]);
    fixture.componentRef.setInput('totalCount', 1);
    fixture.componentRef.setInput('pageNumber', 1);
    fixture.componentRef.setInput('pageSize', 10);
    await fixture.whenStable();
  });

  it('renders movement traceability', () => {
    const content = (fixture.nativeElement as HTMLElement).textContent;
    expect(content).toContain('Monitor');
    expect(content).toContain('Entrada');
    expect(content).toContain('Reposición');
  });
});
