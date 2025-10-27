import { JobFactory } from '../../domain/factories/JobFactory';
import { Job, JobData } from '../../domain/entities/Job';
import { JobRepository } from '../../domain';

export class SubmitJobUseCase {
  constructor(private readonly repository: JobRepository) {}

  async execute(data: JobData): Promise<Job> {
    const job = JobFactory.createJob(data);

    await this.repository.save(job);

    return job;
  }
}