export class AppError extends Error {
  status: number;
  errors?: unknown;

  constructor(message: string, status = 400, errors?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.errors = errors;
  }
}
