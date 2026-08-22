export interface Product {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly price: number;
  readonly stock: number;
  readonly minimumStock: number;
  readonly isLowStock: boolean;
  readonly categoryId: number;
  readonly categoryName: string;
  readonly createdAt: string;
}

export interface ProductUpsertPayload {
  readonly name: string;
  readonly description: string | null;
  readonly price: number;
  readonly stock: number;
  readonly minimumStock: number;
  readonly categoryId: number;
}

export type StockFilter = 'all' | 'low' | 'normal';

export interface ProductFilters {
  readonly categoryId: number | null;
  readonly stock: StockFilter;
}

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  categoryId: null,
  stock: 'all',
};
