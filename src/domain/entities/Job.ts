import { JobStatus } from '../value-objects/JobStatus';
import { JobConfig } from '../value-objects/JobConfig';
import { JobPayload } from '../value-objects/JobPayload';
import { JobResult } from '../value-objects/JobResult';

export interface JobData {
  type: string;
  payload: JobPayload;
  config?: JobConfig;
}

export interface Job {
  readonly id: string;
  readonly status: JobStatus;
  readonly type: string;
  readonly payload: JobPayload;
  readonly config: Required<JobConfig>;
  readonly execution_time?: number;
  readonly result?: JobResult;
  readonly created_at: number;
  readonly eligible_at: number;
  readonly started_at?: number;
  readonly finished_at?: number;
}

export interface JobProps extends JobData {
  id: string;
  status: JobStatus;
  config: Required<JobConfig>;
  created_at: number;
  eligible_at: number;
  execution_time?: number;
  result?: JobResult;
  started_at?: number;
  finished_at?: number;
}