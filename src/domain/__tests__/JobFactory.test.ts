import { JobFactory } from '../factories/JobFactory';
import { JobStatus } from '../value-objects/JobStatus';
import { JobData } from '../entities/Job';
import { createSuccessResult, createErrorResult } from '../value-objects/JobResult';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

describe('JobFactory', () => {
  describe('createJob', () => {
    it('should create a job with valid data', () => {
      const jobData: JobData = {
        type: 'email',
        payload: {
          to: 'test@example.com',
          subject: 'Test',
        },
      };

      const job = JobFactory.createJob(jobData);

      expect(job.id).toBe('test-uuid-1234');
      expect(job.status).toBe(JobStatus.PENDING);
      expect(job.type).toBe('email');
      expect(job.payload).toEqual(jobData.payload);
      expect(job.config.delay).toBe(0);
      expect(job.created_at).toBeDefined();
      expect(job.eligible_at).toBe(job.created_at);
    });

    it('should create a job with custom delay', () => {
      const jobData: JobData = {
        type: 'sms',
        payload: { to: '+1234567890' },
        config: { delay: 5000 },
      };

      const job = JobFactory.createJob(jobData);

      expect(job.config.delay).toBe(5000);
      expect(job.eligible_at).toBe(job.created_at + 5000);
    });

    it('should throw error if payload is empty', () => {
      const jobData: JobData = {
        type: 'email',
        payload: {},
      };

      expect(() => JobFactory.createJob(jobData)).toThrow('Payload cannot be empty');
    });

    it('should throw error if payload is not an object', () => {

      const jobData: any = {
        type: 'email',
        payload: null,
      };

      expect(() => JobFactory.createJob(jobData)).toThrow('Payload must be a valid object');
    });

    it('should throw error if delay is negative', () => {

      const jobData: JobData = {
        type: 'email',
        payload: { to: 'test@example.com' },
        config: { delay: -100 },
      };

      expect(() => JobFactory.createJob(jobData)).toThrow('Delay must be a non-negative number');
    });
  });

  describe('startJob', () => {
    it('should transition job from PENDING to RUNNING', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
        config: { delay: 120000 },
      });

      const runningJob = JobFactory.startJob(job);

      expect(runningJob.status).toBe(JobStatus.RUNNING);
      expect(runningJob.started_at).toBeDefined();
    });

    it('should throw error if job is not PENDING', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const runningJob = JobFactory.startJob(job);

      expect(() => JobFactory.startJob(runningJob)).toThrow(
        'Cannot start job in running status'
      );
    });
  });

  describe('completeJob', () => {
    it('should transition job from RUNNING to COMPLETED', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const runningJob = JobFactory.startJob(job);
      const result = createSuccessResult('Email sent successfully!');

      const completedJob = JobFactory.completeJob(runningJob, result);

      expect(completedJob.status).toBe(JobStatus.COMPLETED);
      expect(completedJob.result).toEqual(result);
      expect(completedJob.execution_time).toBeDefined();
      expect(completedJob.finished_at).toBeDefined();
      expect(completedJob.execution_time).toBeGreaterThanOrEqual(0);
    });

    it('should calculate execution time correctly', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const runningJob = JobFactory.startJob(job);
      const result = createSuccessResult('Success');

      const beforeComplete = Date.now();

      const completedJob = JobFactory.completeJob(runningJob, result);

      const expectedExecutionTime = beforeComplete - runningJob.started_at!;
      expect(completedJob.execution_time).toBeGreaterThanOrEqual(0);
      expect(completedJob.execution_time).toBeLessThanOrEqual(expectedExecutionTime + 10);
    });

    it('should throw error if job is not RUNNING', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const result = createSuccessResult('Success');

      expect(() => JobFactory.completeJob(job, result)).toThrow(
        'Cannot complete job in pending status'
      );
    });
  });

  describe('failJob', () => {
    it('should transition job from RUNNING to FAILED', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const runningJob = JobFactory.startJob(job);
      const errorResult = createErrorResult('SMTP service unavailable', 503);

      const failedJob = JobFactory.failJob(runningJob, errorResult);

      expect(failedJob.status).toBe(JobStatus.FAILED);
      expect(failedJob.result).toEqual(errorResult);
      expect(failedJob.execution_time).toBeDefined();
      expect(failedJob.finished_at).toBeDefined();
    });

    it('should throw error if job is not RUNNING', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const errorResult = createErrorResult('Error', 500);

      expect(() => JobFactory.failJob(job, errorResult)).toThrow(
        'Cannot fail job in pending status'
      );
    });
  });

  describe('cancelJob', () => {
    it('should transition job from PENDING to CANCELLED', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });

      const cancelledJob = JobFactory.cancelJob(job);

      expect(cancelledJob.status).toBe(JobStatus.CANCELLED);
      expect(cancelledJob.result).toBeDefined();
      expect(cancelledJob.result?.message).toBe('Job was cancelled');
      expect(cancelledJob.finished_at).toBeDefined();
    });

    it('should throw error if job is not PENDING', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const runningJob = JobFactory.startJob(job);

      expect(() => JobFactory.cancelJob(runningJob)).toThrow(
        'Cannot cancel job in running status'
      );
    });
  });

  describe('isEligible', () => {
    it('should return true for job without delay', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
        config: { delay: 0 },
      });

      const eligible = JobFactory.isEligible(job);

      expect(eligible).toBe(true);
    });

    it('should return false for job with future eligible_at', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
        config: { delay: 10000 }, // 10 segundos en el futuro
      });

      const eligible = JobFactory.isEligible(job);

      expect(eligible).toBe(false);
    });
  });

  describe('isTerminal', () => {
    it('should return true for COMPLETED status', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const runningJob = JobFactory.startJob(job);
      const completedJob = JobFactory.completeJob(
        runningJob,
        createSuccessResult('Success')
      );

      const isTerminal = JobFactory.isTerminal(completedJob);

      expect(isTerminal).toBe(true);
    });

    it('should return true for FAILED status', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const runningJob = JobFactory.startJob(job);
      const failedJob = JobFactory.failJob(runningJob, createErrorResult('Error', 500));

      const isTerminal = JobFactory.isTerminal(failedJob);

      expect(isTerminal).toBe(true);
    });

    it('should return true for CANCELLED status', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const cancelledJob = JobFactory.cancelJob(job);

      const isTerminal = JobFactory.isTerminal(cancelledJob);

      expect(isTerminal).toBe(true);
    });

    it('should return false for PENDING status', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });

      const isTerminal = JobFactory.isTerminal(job);

      expect(isTerminal).toBe(false);
    });

    it('should return false for RUNNING status', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      const runningJob = JobFactory.startJob(job);

      const isTerminal = JobFactory.isTerminal(runningJob);

      expect(isTerminal).toBe(false);
    });
  });
});