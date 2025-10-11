import { Job } from '../../domain/entities/Job';
import { JobFactory } from '../../domain/factories/JobFactory';
import {
  createSuccessResult,
  createErrorResult,
} from '../../domain/value-objects/JobResult';

export class JobExecutor {
  private readonly MIN_EXECUTION_TIME = 100; // milliseconds
  private readonly MAX_EXECUTION_TIME = 2000; // milliseconds
  private readonly FAILURE_RATE = 0.1; // 10% failure rate

  async executeJob(job: Job): Promise<Job> {
    await this.simulateExecution();

    const shouldFail = this.shouldFail();

    if (shouldFail) {
      const errorResult = createErrorResult(
        this.generateFailureMessage(job.type),
        this.generateErrorCode(),
        { jobType: job.type, timestamp: Date.now() }
      );

      return JobFactory.failJob(job, errorResult);
    }

    const successResult = createSuccessResult(
      this.generateSuccessMessage(job.type),
      { jobType: job.type, processedAt: Date.now() }
    );

    return JobFactory.completeJob(job, successResult);
  }

  private async simulateExecution(): Promise<void> {
    const executionTime = this.generateExecutionTime();
    return new Promise((resolve) => setTimeout(resolve, executionTime));
  }

  private generateExecutionTime(): number {
    return (
      Math.floor(
        Math.random() * (this.MAX_EXECUTION_TIME - this.MIN_EXECUTION_TIME + 1)
      ) + this.MIN_EXECUTION_TIME
    );
  }

  private shouldFail(): boolean {
    return Math.random() < this.FAILURE_RATE;
  }

  private generateSuccessMessage(jobType: string): string {
    const messages: Record<string, string> = {
      email: 'Email sent successfully!',
      sms: 'SMS sent successfully!',
      notification: 'Notification delivered successfully!',
      webhook: 'Webhook called successfully!',
    };

    return messages[jobType] || `Job of type '${jobType}' completed successfully!`;
  }

  private generateFailureMessage(jobType: string): string {
    const messages: Record<string, string> = {
      email: 'Failed to call SMTP service',
      sms: 'Failed to call SMS gateway',
      notification: 'Failed to deliver notification',
      webhook: 'Failed to call webhook endpoint',
    };

    return messages[jobType] || `Failed to execute job of type '${jobType}'`;
  }

  private generateErrorCode(): number {
    const errorCodes = [500, 502, 503, 504];
    return errorCodes[Math.floor(Math.random() * errorCodes.length)];
  }
}