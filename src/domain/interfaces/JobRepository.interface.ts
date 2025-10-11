import { Job, JobStatus } from '../index';

export interface JobRepository {

  save(job: Job): Promise<void>;

  findById(id: string): Promise<Job | undefined>;

  findByStatus(status: JobStatus): Promise<Job[]>;

  findEligibleJobs(): Promise<Job[]>;

  findAllPending(): Promise<Job[]>;

  findAll(): Promise<Job[]>;

  delete(id: string): Promise<boolean>;

  count(): Promise<number>;

  clear(): Promise<void>;
}