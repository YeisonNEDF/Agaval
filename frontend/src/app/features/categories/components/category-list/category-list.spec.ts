import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryListComponent } from './category-list';

describe('CategoryListComponent', () => {
  let fixture: ComponentFixture<CategoryListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryListComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(CategoryListComponent);
    fixture.componentRef.setInput('categories', [
      { id: 1, name: 'Electrónica', isActive: true },
      { id: 2, name: 'Archivada', isActive: false },
    ]);
    await fixture.whenStable();
  });

  it('renders active and inactive states', () => {
    const content = (fixture.nativeElement as HTMLElement).textContent;
    expect(content).toContain('Electrónica');
    expect(content).toContain('Activa');
    expect(content).toContain('Inactiva');
  });

  it('emits the selected category when delete is requested', () => {
    const emitted: unknown[] = [];
    fixture.componentInstance.deleteRequested.subscribe((category) => emitted.push(category));
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');

    buttons[1].click();

    expect(emitted).toEqual([{ id: 1, name: 'Electrónica', isActive: true }]);
  });

  it('provides an accessible name for every icon-only action', () => {
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    );

    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Editar Electrónica',
      'Eliminar Electrónica',
      'Editar Archivada',
      'Eliminar Archivada',
    ]);
  });
});
