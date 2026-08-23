export interface ManagedCategory {
  readonly id: number;
  readonly name: string;
  readonly isActive: boolean;
}

export interface CreateCategoryPayload {
  readonly name: string;
}

export interface UpdateCategoryPayload extends CreateCategoryPayload {
  readonly isActive: boolean;
}
