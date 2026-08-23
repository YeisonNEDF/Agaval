import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { CategoriesStore } from '../../services/categories.store';
import { CategoriesPageComponent } from './categories-page';

describe('CategoriesPageComponent', () => {
  let fixture: ComponentFixture<CategoriesPageComponent>;
  let loadSpy: jasmine.Spy;
  let deleteSpy: jasmine.Spy;
  let dialogOpenSpy: jasmine.Spy;

  beforeEach(async () => {
    loadSpy = jasmine.createSpy('load').and.resolveTo();
    deleteSpy = jasmine.createSpy('delete').and.resolveTo(true);
    dialogOpenSpy = jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(true) });
    await TestBed.configureTestingModule({
      imports: [CategoriesPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: CategoriesStore,
          useValue: {
            categories: signal([{ id: 10, name: 'Ferretería', isActive: true }]),
            activeCount: signal(1),
            inactiveCount: signal(0),
            loading: signal(false),
            saving: signal(false),
            error: signal(null),
            load: loadSpy,
            create: jasmine.createSpy('create').and.resolveTo(true),
            update: jasmine.createSpy('update').and.resolveTo(true),
            delete: deleteSpy,
          },
        },
        { provide: MatDialog, useValue: { open: dialogOpenSpy } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriesPageComponent);
    await fixture.whenStable();
  });

  it('loads the catalog and renders the management route', () => {
    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Gestión de categorías');
  });

  it('deletes a category after explicit confirmation', async () => {
    const category = { id: 10, name: 'Ferretería', isActive: true };

    await fixture.componentInstance.confirmDelete(category);

    expect(dialogOpenSpy).toHaveBeenCalled();
    expect(deleteSpy).toHaveBeenCalledOnceWith(10);
  });
});
