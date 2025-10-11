import { JobRepository } from '../../domain';
import { Job } from '../../domain/entities/Job';

export class GetJobStatusUseCase {
  constructor(private readonly repository: JobRepository) {}

  async execute(jobId: string): Promise<Job> {
    const job = await this.repository.findById(jobId);

    if (!job) {
      throw new Error(`Job with id ${jobId} not found`);
    }

    return job;
  }
}