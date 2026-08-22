export type StockMovementType = 'Entry' | 'Exit';

export interface StockAdjustmentPayload {
  readonly type: StockMovementType;
  readonly quantity: number;
  readonly observation: string | null;
}
