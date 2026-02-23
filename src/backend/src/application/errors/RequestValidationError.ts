import { ErrorCode } from '@copilot-care/shared/types';

export class RequestValidationError extends Error {
  public readonly errorCode: ErrorCode;

  constructor(errorCode: ErrorCode, message: string) {
    super(message);
    this.name = 'RequestValidationError';
    this.errorCode = errorCode;
  }
}
