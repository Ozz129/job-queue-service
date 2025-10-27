import { Job } from '../../domain/entities/Job';
import { JobStatus } from '../../domain/value-objects/JobStatus';
import { JobQueue } from '../../application/services/JobQueue';
import { JobRepository } from '../../domain';
import { promises as fsPromises } from 'fs';
import * as path from 'path';

export class InMemoryJobRepository implements JobRepository {
  private jobQueue: JobQueue;

  constructor() {
    this.jobQueue = new JobQueue();
  }

  async save(job: Job): Promise<Job> {
    if (this.jobQueue.hasJob(job.id)) {
      this.jobQueue.updateJob(job);
    } else {
      this.jobQueue.addJob(job);
    }

    return job;
  }

  async findById(jobId: string): Promise<Job | null> {
    const job = this.jobQueue.getJobById(jobId);
    return job || null;
  }

  async findAll(): Promise<Job[]> {
    return this.jobQueue.listJobs();
  }

  async findByStatus(status: JobStatus): Promise<Job[]> {
    return this.jobQueue.listJobs({ status });
  }

  async getNextEligible(): Promise<Job | null> {
    const job = this.jobQueue.getNextEligibleJob();
    return job || null;
  }

  async getJobCounts(): Promise<Record<JobStatus, number>> {
    return this.jobQueue.getJobCounts();
  }

  async exists(jobId: string): Promise<boolean> {
    return this.jobQueue.hasJob(jobId);
  }

  async count(): Promise<number> {
    return this.jobQueue.getTotalJobs();
  }

  getQueue(): JobQueue {
    return this.jobQueue;
  }

  clear(): void {
    this.jobQueue.clear();
  }

  async saveToFile() {
    const queue = this.getQueue();
    console.log('Saving job queue to file database.json...', queue);

   try {
      await fsPromises.writeFile('database.txt', JSON.stringify(this.jobQueue.listJobs()), { encoding: 'utf-8' });

    } catch (error) {
      console.log(`Error writing to file database.txt: ${error}`);
    }
    console.log(`File database written successfully.`);
  }

  async loadFromFile() {
    const filePath = path.resolve('database.txt');
    try {
      const data = await fsPromises.readFile(filePath, { encoding: 'utf-8' });
      const jobs: Job[] = JSON.parse(data);
      jobs.forEach((job) => this.jobQueue.addJob(job));
      console.log(`Loaded ${jobs.length} jobs from file database.txt`);
    } catch (error) {
      console.log(`Error reading file database.txt: ${error}`);
      return;
    }
  }
    
}