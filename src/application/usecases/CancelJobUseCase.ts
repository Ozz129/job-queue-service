import { JobFactory } from '../../domain/factories/JobFactory';
import { Job } from '../../domain/entities/Job';
import { JobStatus } from '../../domain/value-objects/JobStatus';
import { JobRepository } from '../../domain';

export class CancelJobUseCase {
  constructor(private readonly repository: JobRepository) {}

  async execute(jobId: string): Promise<Job> {
    const job = await this.repository.findById(jobId);

    if (!job) {
      throw new Error(`Job with id ${jobId} not found`);
    }

    if (job.status !== JobStatus.PENDING) {
      throw new Error(
        `Cannot cancel job in ${job.status} status. Only PENDING jobs can be cancelled.`
      );
    }

    const cancelledJob = JobFactory.cancelJob(job);

    await this.repository.save(cancelledJob);

    return cancelledJob;
  }
}