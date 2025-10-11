import { Job } from '../../domain/entities/Job';
import { JobStatus } from '../../domain/value-objects/JobStatus';
import { JobFactory } from '../../domain/factories/JobFactory';


export class JobQueue {
  private jobs: Map<string, Job>;

  constructor() {
    this.jobs = new Map();
  }

  addJob(job: Job): void {
    this.jobs.set(job.id, job);
  }

  getNextEligibleJob(): Job | undefined {    
    const eligibleJobs = Array.from(this.jobs.values()).filter(
      (job) =>
        job.status === JobStatus.PENDING &&
        JobFactory.isEligible(job)
    );

    if (eligibleJobs.length === 0) {
      return undefined;
    }

    eligibleJobs.sort((a, b) => a.created_at - b.created_at);

    return eligibleJobs[0];
  }

  updateJob(job: Job): void {
    if (!this.jobs.has(job.id)) {
      throw new Error(`Job with id ${job.id} not found`);
    }
    this.jobs.set(job.id, job);
  }

  getJobById(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  listJobs(filter?: { status?: JobStatus }): Job[] {
    const allJobs = Array.from(this.jobs.values());

    if (!filter?.status) {
      return allJobs;
    }

    return allJobs.filter((job) => job.status === filter.status);
  }

  getJobCounts(): Record<JobStatus, number> {
    const counts = {
      [JobStatus.PENDING]: 0,
      [JobStatus.RUNNING]: 0,
      [JobStatus.COMPLETED]: 0,
      [JobStatus.FAILED]: 0,
      [JobStatus.CANCELLED]: 0,
    };

    for (const job of this.jobs.values()) {
      counts[job.status]++;
    }

    return counts;
  }

  getTotalJobs(): number {
    return this.jobs.size;
  }

  clear(): void {
    this.jobs.clear();
  }

  hasJob(jobId: string): boolean {
    return this.jobs.has(jobId);
  }

  getPendingJobs(): Job[] {
    return this.listJobs({ status: JobStatus.PENDING });
  }

  getRunningJobs(): Job[] {
    return this.listJobs({ status: JobStatus.RUNNING });
  }

  getTerminalJobs(): Job[] {
    return Array.from(this.jobs.values()).filter((job) =>
      JobFactory.isTerminal(job)
    );
  }
}