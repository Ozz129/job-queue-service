/**
 * Generic job payload
 * Can contain any data specific to the job type
 */
export type JobPayload = Record<string, any>;

export function validatePayload(payload: JobPayload): void {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be a valid object');
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('Payload cannot be empty');
  }
}