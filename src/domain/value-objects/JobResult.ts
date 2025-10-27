/**
 * Success Result
 */
export interface SuccessResult {
  message: string;
  data?: any;
}

/**
 * Error Result
 */
export interface ErrorResult {
  message: string;
  code: number;
  details?: any;
}

export type JobResult = SuccessResult | ErrorResult;

export function isErrorResult(result: JobResult): result is ErrorResult {
  return 'code' in result;
}

export function isSuccessResult(result: JobResult): result is SuccessResult {
  return !isErrorResult(result);
}

export function createSuccessResult(message: string, data?: any): SuccessResult {
  return { message, ...(data && { data }) };
}
 
export function createErrorResult(
  message: string,
  code: number,
  details?: any
): ErrorResult {
  return { message, code, ...(details && { details }) };
}