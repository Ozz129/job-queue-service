import { JobRepository } from '../../domain';
import { Job } from '../../domain/entities/Job';

export class GetAllJobsUseCase {
  constructor(private readonly repository: JobRepository) {}

  async execute(): Promise<Job[]> {
    const job = await this.repository.findAll();

    return job;
  }
}