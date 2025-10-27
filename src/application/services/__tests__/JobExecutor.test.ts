import { JobExecutor } from '../JobExecutor';
import { JobFactory } from '../../../domain/factories/JobFactory';
import { JobStatus } from '../../../domain/value-objects/JobStatus';
import { isErrorResult, isSuccessResult } from '../../../domain/value-objects/JobResult';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-executor'),
}));

describe('JobExecutor', () => {
  let executor: JobExecutor;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
    executor = new JobExecutor();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  async function runJobAndFlush(runningJob: ReturnType<typeof JobFactory.startJob>) {
    const promise = executor.executeJob(runningJob);
    if (typeof jest.runAllTimersAsync === 'function') {
      await jest.runAllTimersAsync();
    } else {
      jest.runAllTimers();
    }
    return await promise;
  }

  describe('executeJob', () => {
    it('should execute a job and return completed or failed status with valid timings', async () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const runningJob = JobFactory.startJob(job);

      const result = await runJobAndFlush(runningJob);

      expect(result.status).toMatch(/completed|failed/);
      expect(result.execution_time).toBeGreaterThanOrEqual(100);
      expect(result.execution_time).toBeLessThanOrEqual(2000);
      expect(result.finished_at).toBeDefined();
      expect(result.result).toBeDefined();
    });

    it('should take between 100-2000ms according to execution_time (no wall clock waits)', async () => {
      const job = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
      });
      const runningJob = JobFactory.startJob(job);

      const result = await runJobAndFlush(runningJob);

      expect(result.execution_time).toBeGreaterThanOrEqual(100);
      expect(result.execution_time).toBeLessThanOrEqual(2000);
    });

    it('should return success result when job succeeds', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const runningJob = JobFactory.startJob(job);

      const result = await runJobAndFlush(runningJob);

      expect(result.status).toBe(JobStatus.COMPLETED);
      expect(result.result).toBeDefined();
      expect(isSuccessResult(result.result!)).toBe(true);
      expect(result.result?.message).toContain('successfully');
    });

    it('should return error result when job fails', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.05);

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const runningJob = JobFactory.startJob(job);

      const result = await runJobAndFlush(runningJob);

      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.result).toBeDefined();
      expect(isErrorResult(result.result!)).toBe(true);

      if (isErrorResult(result.result!)) {
        expect(result.result.code).toBeGreaterThanOrEqual(500);
        expect(result.result.code).toBeLessThanOrEqual(504);
        expect(result.result.message).toBeDefined();
      }
    });

    it('should include job type in success message', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // éxito

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const runningJob = JobFactory.startJob(job);

      const result = await runJobAndFlush(runningJob);

      expect(result.result?.message).toContain('Email');
    });

    it('should include job type in error message', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.05); // fallo

      const job = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
      });
      const runningJob = JobFactory.startJob(job);

      const result = await runJobAndFlush(runningJob);

      if (isErrorResult(result.result!)) {
        expect(result.result.message).toContain('SMS');
      }
    });

    it('should handle different job types', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // éxito

      const jobTypes = ['email', 'sms', 'notification', 'webhook'] as const;

      for (const type of jobTypes) {
        const job = JobFactory.createJob({ type, payload: { data: 'test' } });
        const runningJob = JobFactory.startJob(job);
        const result = await runJobAndFlush(runningJob);

        expect(result.status).toBe(JobStatus.COMPLETED);
        expect(result.result).toBeDefined();
      }
    });

    it('should include execution timestamp in result data', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const runningJob = JobFactory.startJob(job);

      const beforeExecution = Date.now();
      const promise = executor.executeJob(runningJob);

      if (typeof jest.runAllTimersAsync === 'function') {
        await jest.runAllTimersAsync();
      } else {
        jest.runAllTimers();
      }
      const result = await promise;
      const afterExecution = Date.now();

      if (isSuccessResult(result.result!)) {
        expect(result.result.data).toBeDefined();
        expect(result.result.data.processedAt).toBeGreaterThanOrEqual(beforeExecution);
        expect(result.result.data.processedAt).toBeLessThanOrEqual(afterExecution);
      }
    });

    it('should calculate execution_time correctly', async () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const runningJob = JobFactory.startJob(job);

      const result = await runJobAndFlush(runningJob);

      const expectedTime = result.finished_at! - runningJob.started_at!;
      expect(result.execution_time).toBeGreaterThanOrEqual(expectedTime - 10);
      expect(result.execution_time).toBeLessThanOrEqual(expectedTime + 10);
    });
  });

  describe('failure rate', () => {
    it('should fail approximately 10% of jobs without timing out', async () => {
      const totalJobs = 100;

      const promises: Array<ReturnType<typeof executor.executeJob>> = [];

      for (let i = 0; i < totalJobs; i++) {
        const job = JobFactory.createJob({
          type: 'email',
          payload: { to: `test${i}@example.com` },
        });
        const runningJob = JobFactory.startJob(job);
        promises.push(executor.executeJob(runningJob));
      }

      if (typeof jest.runAllTimersAsync === 'function') {
        await jest.runAllTimersAsync();
      } else {
        jest.runAllTimers();
      }
      const results = await Promise.all(promises);

      const failedCount = results.filter(r => r.status === JobStatus.FAILED).length;
      const completedCount = results.filter(r => r.status === JobStatus.COMPLETED).length;

      const failureRate = failedCount / totalJobs;

      expect(failedCount + completedCount).toBe(totalJobs);
      expect(failureRate).toBeGreaterThanOrEqual(0.05);
      expect(failureRate).toBeLessThanOrEqual(0.20);
    });
  });
});
