import { CATEGORY_ROUTES } from './categories/routes';
import { INVENTORY_MOVEMENT_ROUTES } from './inventory-movements/routes';

describe('optional feature routes', () => {
  it('loads categories and movements lazily', () => {
    expect(CATEGORY_ROUTES[0].path).toBe('');
    expect(typeof CATEGORY_ROUTES[0].loadComponent).toBe('function');
    expect(INVENTORY_MOVEMENT_ROUTES[0].path).toBe('');
    expect(typeof INVENTORY_MOVEMENT_ROUTES[0].loadComponent).toBe('function');
  });
});
