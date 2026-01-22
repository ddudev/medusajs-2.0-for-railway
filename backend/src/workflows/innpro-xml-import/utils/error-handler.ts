/**
 * Error handling utilities for InnPro XML import workflow
 */

/**
 * Logs an error with consistent formatting
 * @param logger - MedusaJS logger instance
 * @param operation - Description of the operation that failed
 * @param error - The error that occurred
 */
export function logError(logger: any, operation: string, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  logger.error(`Failed to ${operation}: ${errorMessage}`)
  
  // Only log stack trace in debug mode for cleaner logs
  if (error instanceof Error && error.stack) {
    logger.debug(`Stack trace: ${error.stack}`)
  }
}

/**
 * Extracts a clean error message from any error type
 * @param error - The error to extract message from
 * @returns Clean error message string
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown error'
}

/**
 * Checks if an error indicates a resource already exists
 * @param error - The error to check
 * @returns True if error indicates resource exists
 */
export function isAlreadyExistsError(error: unknown): boolean {
  const message = getErrorMessage(error)
  return message.includes('already exists') || message.includes('handle')
}
