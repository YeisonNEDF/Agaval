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
export type ProductSortField = 'Name' | 'Category' | 'Price' | 'Stock' | 'CreatedAt';
export type SortDirection = 'Ascending' | 'Descending';

export interface ProductFilters {
  readonly categoryId: number | null;
  readonly stock: StockFilter;
  readonly search: string;
}

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  categoryId: null,
  stock: 'all',
  search: '',
};

export interface ProductQuery extends ProductFilters {
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly sortBy: ProductSortField;
  readonly sortDirection: SortDirection;
}

export const DEFAULT_PRODUCT_QUERY: ProductQuery = {
  ...DEFAULT_PRODUCT_FILTERS,
  pageNumber: 1,
  pageSize: 10,
  sortBy: 'Name',
  sortDirection: 'Ascending',
};

export interface InventorySummary {
  readonly totalProducts: number;
  readonly lowStockProducts: number;
  readonly inventoryValue: number;
}
