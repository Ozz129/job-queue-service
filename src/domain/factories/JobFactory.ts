import { v4 as uuidv4 } from 'uuid';
import { Job, JobData } from '../entities/Job';
import { JobStatus } from '../value-objects/JobStatus';
import { normalizeJobConfig } from '../value-objects/JobConfig';
import { validatePayload } from '../value-objects/JobPayload';
import { JobResult } from '../value-objects/JobResult';

/**
 * JobFactory
 * Handles creation and transformation of Job entities
 */
export class JobFactory {
  /**
   * Creates a new Job from JobData
   * Initial status is PENDING
   */
  static createJob(data: JobData): Job {
    // Validate payload
    validatePayload(data.payload);

    // Normalize config with defaults
    const config = normalizeJobConfig(data.config);

    const now = Date.now();
    const eligible_at = now + config.delay;

    return {
      id: uuidv4(),
      status: JobStatus.PENDING,
      type: data.type,
      payload: data.payload,
      config,
      created_at: now,
      eligible_at,
    };
  }

  /**
   * Transitions a job to RUNNING status
   */
  static startJob(job: Job): Job {
    if (job.status !== JobStatus.PENDING) {
      throw new Error(`Cannot start job in ${job.status} status`);
    }

    const now = Date.now();
    return {
      ...job,
      status: JobStatus.RUNNING,
      started_at: now,
    };
  }

  /**
   * Transitions a job to COMPLETED status with result
   */
  static completeJob(job: Job, result: JobResult): Job {
    if (job.status !== JobStatus.RUNNING) {
      throw new Error(`Cannot complete job in ${job.status} status`);
    }

    const now = Date.now();
    const execution_time = job.started_at ? now - job.started_at : 0;

    return {
      ...job,
      status: JobStatus.COMPLETED,
      result,
      execution_time,
      finished_at: now,
    };
  }

  /**
   * Transitions a job to FAILED status with error result
   */
  static failJob(job: Job, result: JobResult): Job {
    if (job.status !== JobStatus.RUNNING) {
      throw new Error(`Cannot fail job in ${job.status} status`);
    }

    const now = Date.now();
    const execution_time = job.started_at ? now - job.started_at : 0;

    return {
      ...job,
      status: JobStatus.FAILED,
      result,
      execution_time,
      finished_at: now,
    };
  }

  /**
   * Transitions a job to CANCELLED status
   * Can only cancel PENDING jobs
   */
  static cancelJob(job: Job): Job {
    if (job.status !== JobStatus.PENDING) {
      throw new Error(`Cannot cancel job in ${job.status} status`);
    }

    return {
      ...job,
      status: JobStatus.CANCELLED,
      result: {
        message: 'Job was cancelled',
        code: 499, // Client Closed Request
      },
      finished_at: Date.now(),
    };
  }

  /**
   * Checks if a job is eligible to run (delay has passed)
   */
  static isEligible(job: Job): boolean {
    return Date.now() >= job.eligible_at;
  }

  /**
   * Checks if a job is in a terminal state
   */
  static isTerminal(job: Job): boolean {
    return [
      JobStatus.COMPLETED,
      JobStatus.FAILED,
      JobStatus.CANCELLED,
    ].includes(job.status);
  }
}