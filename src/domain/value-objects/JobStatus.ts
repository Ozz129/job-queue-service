export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export function isValidJobStatus(status: string): status is JobStatus {
  return Object.values(JobStatus).includes(status as JobStatus);
}