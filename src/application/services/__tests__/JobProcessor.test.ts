import { JobProcessor } from '../JobProcessor';
import { JobQueue } from '../JobQueue';
import { JobExecutor } from '../JobExecutor';
import { JobFactory } from '../../../domain/factories/JobFactory';
import { JobStatus } from '../../../domain/value-objects/JobStatus';
import { createSuccessResult } from '../../../domain/value-objects/JobResult';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-processor'),
}));

describe('JobProcessor', () => {
  let processor: JobProcessor;
  let mockQueue: jest.Mocked<JobQueue>;
  let mockExecutor: jest.Mocked<JobExecutor>;

  beforeEach(() => {
    jest.useFakeTimers();

    mockQueue = {
      getNextEligibleJob: jest.fn(),
      updateJob: jest.fn(),
      addJob: jest.fn(),
      getJobById: jest.fn(),
      listJobs: jest.fn(),
      getJobCounts: jest.fn(),
      getTotalJobs: jest.fn(),
      hasJob: jest.fn(),
      clear: jest.fn(),
      getPendingJobs: jest.fn(),
      getRunningJobs: jest.fn(),
      getTerminalJobs: jest.fn(),
    } as any;

    mockExecutor = {
      executeJob: jest.fn(),
    } as any;

    processor = new JobProcessor(mockQueue, mockExecutor);
  });

  afterEach(() => {
    if (processor.isProcessing()) {
      processor.stop();
    }
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('start and stop', () => {
    it('should start the processor', () => {
      processor.start();
      expect(processor.isProcessing()).toBe(true);
    });

    it('should stop the processor', () => {
      processor.start();
      processor.stop();

      expect(processor.isProcessing()).toBe(false);
    });

    it('should not start if already running', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      processor.start();
      processor.start();

      expect(consoleSpy).toHaveBeenCalledWith('JobProcessor is already running');
      consoleSpy.mockRestore();
    });

    it('should not stop if not running', () => {

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      processor.stop();

      expect(consoleSpy).toHaveBeenCalledWith('JobProcessor is not running');
      consoleSpy.mockRestore();
    });
  });

  describe('processNextJob with fake timers', () => {
    it('should not process if no eligible job', async () => {

      mockQueue.getNextEligibleJob.mockReturnValue(undefined);

      processor.start();
      await jest.advanceTimersByTimeAsync(100); // Avanzar varios ciclos

      expect(mockExecutor.executeJob).not.toHaveBeenCalled();
    });

    it('should process a job when available', async () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });

      let callCount = 0;
      mockQueue.getNextEligibleJob.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? job : undefined;
      });

      const completedJob = JobFactory.completeJob(
        JobFactory.startJob(job),
        createSuccessResult('Success')
      );
      mockExecutor.executeJob.mockResolvedValue(completedJob);

      processor.start();
      await jest.advanceTimersByTimeAsync(100);

      expect(mockExecutor.executeJob).toHaveBeenCalledTimes(1);
      expect(mockQueue.updateJob).toHaveBeenCalledTimes(2); // RUNNING + COMPLETED
    });

    it('should mark job as RUNNING before execution', async () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });

      let callCount = 0;
      mockQueue.getNextEligibleJob.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? job : undefined;
      });

      const completedJob = JobFactory.completeJob(
        JobFactory.startJob(job),
        createSuccessResult('Success')
      );
      mockExecutor.executeJob.mockResolvedValue(completedJob);

      processor.start();
      await jest.advanceTimersByTimeAsync(100);

      const firstUpdateCall = (mockQueue.updateJob as jest.Mock).mock.calls[0][0];
      expect(firstUpdateCall.status).toBe(JobStatus.RUNNING);
    });

    it('should update job with result after execution', async () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });

      let callCount = 0;
      mockQueue.getNextEligibleJob.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? job : undefined;
      });

      const runningJob = JobFactory.startJob(job);
      const completedJob = JobFactory.completeJob(
        runningJob,
        createSuccessResult('Email sent!')
      );
      mockExecutor.executeJob.mockResolvedValue(completedJob);

      processor.start();
      await jest.advanceTimersByTimeAsync(100);

      const secondUpdateCall = (mockQueue.updateJob as jest.Mock).mock.calls[1][0];
      expect(secondUpdateCall.status).toBe(JobStatus.COMPLETED);
      expect(secondUpdateCall.result).toBeDefined();
      expect(secondUpdateCall.result.message).toBe('Email sent!');
    });

    it('should continue processing after errors', async () => {

      const job1 = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test1@example.com' },
      });

      const job2 = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
      });

      let callCount = 0;
      mockQueue.getNextEligibleJob.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return job1;
        if (callCount === 2) return job2;
        return undefined;
      });

      mockExecutor.executeJob
        .mockRejectedValueOnce(new Error('Execution failed'))
        .mockResolvedValueOnce(
          JobFactory.completeJob(
            JobFactory.startJob(job2),
            createSuccessResult('Success')
          )
        );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();


      processor.start();
      await jest.advanceTimersByTimeAsync(150); 


      expect(processor.isProcessing()).toBe(true);
      expect(mockQueue.getNextEligibleJob).toHaveBeenCalledTimes(3);
      
      consoleSpy.mockRestore();
    });

    it('should process multiple jobs sequentially', async () => {

      const job1 = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test1@example.com' },
      });
      const job2 = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
      });

      let callCount = 0;
      mockQueue.getNextEligibleJob.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return job1;
        if (callCount === 2) return job2;
        return undefined;
      });

      const completedJob1 = JobFactory.completeJob(
        JobFactory.startJob(job1),
        createSuccessResult('Success 1')
      );
      const completedJob2 = JobFactory.completeJob(
        JobFactory.startJob(job2),
        createSuccessResult('Success 2')
      );

      mockExecutor.executeJob
        .mockResolvedValueOnce(completedJob1)
        .mockResolvedValueOnce(completedJob2);


      processor.start();
      await jest.advanceTimersByTimeAsync(150);


      expect(mockExecutor.executeJob).toHaveBeenCalledTimes(2);
      expect(mockQueue.updateJob).toHaveBeenCalledTimes(4);
    });
  });

  describe('processJobById', () => {
    it('should process a specific job immediately', async () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });

      mockQueue.getJobById.mockReturnValue(job);
      
      const completedJob = JobFactory.completeJob(
        JobFactory.startJob(job),
        createSuccessResult('Success')
      );
      mockExecutor.executeJob.mockResolvedValue(completedJob);

      const result = await processor.processJobById(job.id);


      expect(result.status).toBe(JobStatus.COMPLETED);
      expect(mockQueue.updateJob).toHaveBeenCalledTimes(2);
    });

    it('should throw error if job not found', async () => {

      mockQueue.getJobById.mockReturnValue(undefined);

      await expect(processor.processJobById('non-existent')).rejects.toThrow(
        'Job with id non-existent not found'
      );
    });

    it('should throw error if job is not eligible yet', async () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
        config: { delay: 10000 },
      });

      mockQueue.getJobById.mockReturnValue(job);

      await expect(processor.processJobById(job.id)).rejects.toThrow(
        'is not eligible yet'
      );
    });

    it('should handle executor errors', async () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });

      mockQueue.getJobById.mockReturnValue(job);
      mockExecutor.executeJob.mockRejectedValue(new Error('Execution failed'));

      await expect(processor.processJobById(job.id)).rejects.toThrow('Execution failed');
    });
  });

  describe('isProcessing', () => {
    it('should return true when processor is running', () => {
      processor.start();
      expect(processor.isProcessing()).toBe(true);
    });

    it('should return false when processor is stopped', () => {

      processor.start();
      processor.stop();

      expect(processor.isProcessing()).toBe(false);
    });

    it('should return false initially', () => {
      expect(processor.isProcessing()).toBe(false);
    });
  });
});