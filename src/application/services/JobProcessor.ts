import { JobQueue } from './JobQueue';
import { JobExecutor } from './JobExecutor';
import { JobFactory } from '../../domain/factories/JobFactory';
import { Job } from '../../domain/entities/Job';

export class JobProcessor {
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL = 50; // milliseconds

  constructor(
    private readonly jobQueue: JobQueue,
    private readonly jobExecutor: JobExecutor
  ) {}

  start(): void {
    if (this.isRunning) {
      console.warn('JobProcessor is already running');
      return;
    }

    this.isRunning = true;
    console.log('JobProcessor started');

    this.processingInterval = setInterval(
      () => this.processNextJob(),
      this.POLLING_INTERVAL
    );
  }

  stop(): void {
    if (!this.isRunning) {
      console.warn('JobProcessor is not running');
      return;
    }

    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    console.log('JobProcessor stopped');
  }

  private async processNextJob(): Promise<void> {
    try {
      const job = this.jobQueue.getNextEligibleJob();

      if (!job) {
        return;
      }

      const runningJob = JobFactory.startJob(job);
      this.jobQueue.updateJob(runningJob);

      console.log(`Processing job ${runningJob.id} of type '${runningJob.type}'`);

      const finishedJob = await this.jobExecutor.executeJob(runningJob);

      this.jobQueue.updateJob(finishedJob);

      console.log(
        `Job ${finishedJob.id} finished with status '${finishedJob.status}' ` +
        `in ${finishedJob.execution_time}ms`
      );

    } catch (error) {
      console.error('Error processing job:', error);
    }
  }


  isProcessing(): boolean {
    return this.isRunning;
  }

  async processJobById(jobId: string): Promise<Job> {
    const job = this.jobQueue.getJobById(jobId);

    if (!job) {
      throw new Error(`Job with id ${jobId} not found`);
    }

    if (!JobFactory.isEligible(job)) {
      throw new Error(`Job ${jobId} is not eligible yet (delay not fulfilled)`);
    }

    const runningJob = JobFactory.startJob(job);
    this.jobQueue.updateJob(runningJob);

    const finishedJob = await this.jobExecutor.executeJob(runningJob);

    this.jobQueue.updateJob(finishedJob);

    return finishedJob;
  }
}