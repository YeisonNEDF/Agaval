import { PRODUCT_ROUTES } from './routes';

describe('PRODUCT_ROUTES', () => {
  it('exposes inventory and low-stock views through lazy components', () => {
    expect(PRODUCT_ROUTES.map((route) => route.path)).toEqual(['', 'stock-bajo']);
    expect(PRODUCT_ROUTES.every((route) => typeof route.loadComponent === 'function')).toBeTrue();
  });
});
