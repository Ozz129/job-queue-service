import { Job } from '../../domain/entities/Job';
import { JobStatus } from '../../domain/value-objects/JobStatus';


export interface JobRepository {
  save(job: Job): Promise<Job>;
  findById(jobId: string): Promise<Job | null>;
  findAll(): Promise<Job[]>;
  findByStatus(status: JobStatus): Promise<Job[]>;
  getNextEligible(): Promise<Job | null>;
  getJobCounts(): Promise<Record<JobStatus, number>>;
  exists(jobId: string): Promise<boolean>;
  count(): Promise<number>;
}