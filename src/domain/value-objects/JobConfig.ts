/**
 * Job Configuration
 * Contains execution configuration for a job
 */
export interface JobConfig {
  /**
   * Delay in milliseconds before the job should start executing
   * @default 0
   */
  delay?: number;
}

/**
 * Default configuration for jobs
 */
export const DEFAULT_JOB_CONFIG: Required<JobConfig> = {
  delay: 0,
};

/**
 * Validates and normalizes job configuration
 * @param config - Raw configuration object
 * @returns Normalized configuration with defaults
 */
export function normalizeJobConfig(config?: JobConfig): Required<JobConfig> {
  const delay = config?.delay ?? DEFAULT_JOB_CONFIG.delay;

  if (delay < 0) {
    throw new Error('Delay must be a non-negative number');
  }

  return { delay };
}