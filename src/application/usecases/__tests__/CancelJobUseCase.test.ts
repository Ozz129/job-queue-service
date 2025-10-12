import { CancelJobUseCase } from '../CancelJobUseCase';
import { JobFactory } from '../../../domain/factories/JobFactory';
import { JobStatus } from '../../../domain/value-objects/JobStatus';
import { createSuccessResult } from '../../../domain/value-objects/JobResult';
import { JobRepository } from '../../../domain';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-cancel'),
}));

describe('CancelJobUseCase', () => {
  let useCase: CancelJobUseCase;
  let mockRepository: jest.Mocked<JobRepository>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByStatus: jest.fn(),
      getNextEligible: jest.fn(),
      getJobCounts: jest.fn(),
      exists: jest.fn(),
      count: jest.fn(),
    } as jest.Mocked<JobRepository>;

    useCase = new CancelJobUseCase(mockRepository);
  });

  it('should cancel a pending job', async () => {
    const job = JobFactory.createJob({
      type: 'email',
      payload: {
        to: 'test@example.com',
      },
    });

    mockRepository.findById.mockResolvedValue(job);
    mockRepository.save.mockImplementation(async (job) => job);

    const cancelledJob = await useCase.execute(job.id);

    expect(cancelledJob.status).toBe(JobStatus.CANCELLED);
    expect(cancelledJob.result).toBeDefined();
    expect(cancelledJob.result?.message).toBe('Job was cancelled');
    expect(cancelledJob.finished_at).toBeDefined();
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw error if job does not exist', async () => {
    const jobId = 'non-existent-job-id';
    mockRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(jobId)).rejects.toThrow(
      `Job with id ${jobId} not found`
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should throw error if job is RUNNING', async () => {
    const job = JobFactory.createJob({
      type: 'email',
      payload: {
        to: 'test@example.com',
      },
    });

    const runningJob = JobFactory.startJob(job);
    mockRepository.findById.mockResolvedValue(runningJob);

    await expect(useCase.execute(runningJob.id)).rejects.toThrow(
      'Cannot cancel job in running status'
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should throw error if job is COMPLETED', async () => {
    const job = JobFactory.createJob({
      type: 'email',
      payload: {
        to: 'test@example.com',
      },
    });

    const runningJob = JobFactory.startJob(job);
    const completedJob = JobFactory.completeJob(
      runningJob,
      createSuccessResult('Success')
    );

    mockRepository.findById.mockResolvedValue(completedJob);

    await expect(useCase.execute(completedJob.id)).rejects.toThrow(
      'Cannot cancel job in completed status'
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should throw error if job is FAILED', async () => {
    const job = JobFactory.createJob({
      type: 'email',
      payload: {
        to: 'test@example.com',
      },
    });

    const runningJob = JobFactory.startJob(job);
    const failedJob = JobFactory.failJob(runningJob, {
      message: 'Error',
      code: 500,
    });

    mockRepository.findById.mockResolvedValue(failedJob);

    await expect(useCase.execute(failedJob.id)).rejects.toThrow(
      'Cannot cancel job in failed status'
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should throw error if job is already CANCELLED', async () => {
    const job = JobFactory.createJob({
      type: 'email',
      payload: {
        to: 'test@example.com',
      },
    });

    const cancelledJob = JobFactory.cancelJob(job);
    mockRepository.findById.mockResolvedValue(cancelledJob);

    await expect(useCase.execute(cancelledJob.id)).rejects.toThrow(
      'Cannot cancel job in cancelled status'
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should set result code to 499', async () => {
    const job = JobFactory.createJob({
      type: 'email',
      payload: {
        to: 'test@example.com',
      },
    });

    mockRepository.findById.mockResolvedValue(job);
    mockRepository.save.mockImplementation(async (job) => job);

    const cancelledJob = await useCase.execute(job.id);

    expect(cancelledJob.result).toBeDefined();
    if ('code' in cancelledJob.result!) {
      expect(cancelledJob.result.code).toBe(499);
    }
  });

  it('should handle repository errors on findById', async () => {
    const jobId = 'some-job-id';
    mockRepository.findById.mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute(jobId)).rejects.toThrow('Database error');
  });

  it('should handle repository errors on save', async () => {
    const job = JobFactory.createJob({
      type: 'email',
      payload: {
        to: 'test@example.com',
      },
    });

    mockRepository.findById.mockResolvedValue(job);
    mockRepository.save.mockRejectedValue(new Error('Save failed'));

    await expect(useCase.execute(job.id)).rejects.toThrow('Save failed');
  });
});