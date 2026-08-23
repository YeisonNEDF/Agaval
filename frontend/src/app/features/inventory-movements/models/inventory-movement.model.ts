export type StockMovementType = 'Entry' | 'Exit';

export interface InventoryMovement {
  readonly id: number;
  readonly productId: number;
  readonly productName: string;
  readonly type: StockMovementType;
  readonly quantity: number;
  readonly occurredAt: string;
  readonly observation: string | null;
}

export interface MovementProductOption {
  readonly id: number;
  readonly name: string;
}

export interface InventoryMovementFilters {
  readonly productId: number | null;
  readonly type: StockMovementType | null;
}

export interface InventoryMovementQuery extends InventoryMovementFilters {
  readonly pageNumber: number;
  readonly pageSize: number;
}

export const DEFAULT_MOVEMENT_QUERY: InventoryMovementQuery = {
  productId: null,
  type: null,
  pageNumber: 1,
  pageSize: 10,
};
