import { JobRepository } from '../../domain';
import { InMemoryJobRepository } from '../../infrastructure/repositories/InMemoryJobRepository';
import { JobExecutor } from './JobExecutor';
import { JobProcessor } from './JobProcessor';

export class JobWorker {
  private repository: JobRepository;
  private executor: JobExecutor;
  private processor: JobProcessor;
  private isInitialized: boolean = false;

  constructor() {
    this.repository = new InMemoryJobRepository();
    this.executor = new JobExecutor();
    
    const inMemoryRepo = this.repository as InMemoryJobRepository;
    const queue = inMemoryRepo.getQueue();
    
    this.processor = new JobProcessor(queue, this.executor);
  }

  start(): void {
    if (this.isInitialized) {
      console.warn('JobWorker is already initialized');
      return;
    }

    console.log('Starting JobWorker...');

    this.processor.start();

    this.isInitialized = true;
    console.log('JobWorker started successfully');
  }

  stop(): void {
    if (!this.isInitialized) {
      console.warn('JobWorker is not initialized');
      return;
    }

    console.log('Stopping JobWorker...');

    this.processor.stop();

    this.isInitialized = false;
    console.log('JobWorker stopped successfully');
  }

  getRepository(): JobRepository {
    return this.repository;
  }

  getProcessor(): JobProcessor {
    return this.processor;
  }

  isRunning(): boolean {
    return this.isInitialized && this.processor.isProcessing();
  }

  restart(): void {
    console.log('Restarting JobWorker...');
    this.stop();
    this.start();
  }
}