import { GetJobStatusUseCase } from '../GetJobStatusUseCase';
import { JobFactory } from '../../../domain/factories/JobFactory';
import { createSuccessResult } from '../../../domain/value-objects/JobResult';
import { JobRepository } from '../../../domain';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-get'),
}));

describe('GetJobStatusUseCase', () => {
  let useCase: GetJobStatusUseCase;
  let mockRepository: jest.Mocked<JobRepository>;

  beforeEach(() => {
    // Create mock repository
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

    useCase = new GetJobStatusUseCase(mockRepository);
  });

  it('should return job when it exists', async () => {
    const job = JobFactory.createJob({
      type: 'email',
      payload: {
        to: 'test@example.com',
      },
    });

    mockRepository.findById.mockResolvedValue(job);

    const result = await useCase.execute(job.id);

    expect(result).toEqual(job);
    expect(mockRepository.findById).toHaveBeenCalledTimes(1);
    expect(mockRepository.findById).toHaveBeenCalledWith(job.id);
  });

  it('should throw error when job does not exist', async () => {
    const jobId = 'non-existent-job-id';
    mockRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(jobId)).rejects.toThrow(
      `Job with id ${jobId} not found`
    );
    expect(mockRepository.findById).toHaveBeenCalledWith(jobId);
  });

  it('should return completed job with result', async () => {
    const job = JobFactory.createJob({
      type: 'email',
      payload: {
        to: 'test@example.com',
      },
    });

    const runningJob = JobFactory.startJob(job);
    const completedJob = JobFactory.completeJob(
      runningJob,
      createSuccessResult('Email sent successfully!')
    );

    mockRepository.findById.mockResolvedValue(completedJob);

    const result = await useCase.execute(completedJob.id);

    expect(result.status).toBe('completed');
    expect(result.result).toBeDefined();
    expect(result.result?.message).toBe('Email sent successfully!');
    expect(result.execution_time).toBeDefined();
    expect(result.finished_at).toBeDefined();
  });

  it('should return pending job without result', async () => {
    const job = JobFactory.createJob({
      type: 'sms',
      payload: {
        to: '+1234567890',
      },
    });

    mockRepository.findById.mockResolvedValue(job);

    const result = await useCase.execute(job.id);

    expect(result.status).toBe('pending');
    expect(result.result).toBeUndefined();
    expect(result.execution_time).toBeUndefined();
    expect(result.started_at).toBeUndefined();
  });

  it('should return running job', async () => {
    const job = JobFactory.createJob({
      type: 'notification',
      payload: {
        userId: '123',
      },
    });

    const runningJob = JobFactory.startJob(job);
    mockRepository.findById.mockResolvedValue(runningJob);

    const result = await useCase.execute(runningJob.id);

    expect(result.status).toBe('running');
    expect(result.started_at).toBeDefined();
    expect(result.result).toBeUndefined();
    expect(result.finished_at).toBeUndefined();
  });

  it('should handle repository errors', async () => {
    const jobId = 'some-job-id';
    mockRepository.findById.mockRejectedValue(new Error('Database connection error'));

    await expect(useCase.execute(jobId)).rejects.toThrow('Database connection error');
  });
});