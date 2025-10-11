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

/**
 * Job Result - can be either success or error
 */
export type JobResult = SuccessResult | ErrorResult;

/**
 * Type guard to check if result is an error
 */
export function isErrorResult(result: JobResult): result is ErrorResult {
  return 'code' in result;
}

/**
 * Type guard to check if result is a success
 */
export function isSuccessResult(result: JobResult): result is SuccessResult {
  return !isErrorResult(result);
}

/**
 * Factory function to create a success result
 */
export function createSuccessResult(message: string, data?: any): SuccessResult {
  return { message, ...(data && { data }) };
}

/**
 * Factory function to create an error result
 */
export function createErrorResult(
  message: string,
  code: number,
  details?: any
): ErrorResult {
  return { message, code, ...(details && { details }) };
}