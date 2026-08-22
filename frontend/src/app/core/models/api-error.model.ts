export type ValidationErrors = Readonly<Record<string, readonly string[]>>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly validationErrors: ValidationErrors = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
