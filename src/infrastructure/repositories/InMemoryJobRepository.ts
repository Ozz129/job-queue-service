import { Job, JobStatus, JobFactory, JobRepository } from '../../domain';

export class InMemoryJobRepository implements JobRepository {
  private jobs: Map<string, Job>;

  constructor() {
    this.jobs = new Map();
  }

  async save(job: Job): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async findById(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async findByStatus(status: JobStatus): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter((job) => job.status === status);
  }

  async findEligibleJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter((job) => job.status === JobStatus.PENDING)
      .filter((job) => JobFactory.isEligible(job))
      .sort((a, b) => a.created_at - b.created_at);
  }

  async findAllPending(): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter((job) => job.status === JobStatus.PENDING)
      .sort((a, b) => a.created_at - b.created_at);
  }

  async findAll(): Promise<Job[]> {
    return Array.from(this.jobs.values());
  }

  async delete(id: string): Promise<boolean> {
    return this.jobs.delete(id);
  }

  async count(): Promise<number> {
    return this.jobs.size;
  }

  async clear(): Promise<void> {
    this.jobs.clear();
  }

  async getNextJobToExecute(): Promise<Job | undefined> {
    const eligibleJobs = await this.findEligibleJobs();
    return eligibleJobs[0]; // Already sorted by created_at (FIFO)
  }

  async getJobsWaitingForDelay(): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter((job) => job.status === JobStatus.PENDING)
      .filter((job) => !JobFactory.isEligible(job)) // Not eligible yet
      .sort((a, b) => a.eligible_at - b.eligible_at); // Sort by when they become eligible
  }

  async getNextJobToBecomeEligible(): Promise<Job | undefined> {
    const waiting = await this.getJobsWaitingForDelay();
    return waiting[0]; // Already sorted by eligible_at
  }

  async countByStatus(): Promise<Record<JobStatus, number>> {
    const counts: Record<JobStatus, number> = {
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

  async findTerminalJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter((job) => JobFactory.isTerminal(job));
  }

  async getStats(): Promise<{
    total: number;
    byStatus: Record<JobStatus, number>;
    eligibleCount: number;
    waitingCount: number;
  }> {
    const byStatus = await this.countByStatus();
    const eligible = await this.findEligibleJobs();
    const waiting = await this.getJobsWaitingForDelay();

    return {
      total: this.jobs.size,
      byStatus,
      eligibleCount: eligible.length,
      waitingCount: waiting.length,
    };
  }
}