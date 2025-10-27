import { SubmitJobUseCase } from '../SubmitJobUseCase';
import { JobStatus } from '../../../domain/value-objects/JobStatus';
import { JobData } from '../../../domain/entities/Job';
import { JobRepository } from '../../../domain';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-submit'),
}));

describe('SubmitJobUseCase', () => {
  let useCase: SubmitJobUseCase;
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

    useCase = new SubmitJobUseCase(mockRepository);
  });

  it('should create and save a job with valid data', async () => {
    const jobData: JobData = {
      type: 'email',
      payload: {
        to: 'user@example.com',
        subject: 'Test Email',
      },
    };

    mockRepository.save.mockImplementation(async (job) => job);


    const job = await useCase.execute(jobData);

    expect(job).toBeDefined();
    expect(job.id).toBe('test-uuid-submit');
    expect(job.status).toBe(JobStatus.PENDING);
    expect(job.type).toBe('email');
    expect(job.payload).toEqual(jobData.payload);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockRepository.save).toHaveBeenCalledWith(job);
  });

  it('should create job with custom delay', async () => {
    const jobData: JobData = {
      type: 'sms',
      payload: {
        to: '+1234567890',
        message: 'Test SMS',
      },
      config: {
        delay: 5000,
      },
    };

    mockRepository.save.mockImplementation(async (job) => job);


    const job = await useCase.execute(jobData);

    expect(job.config.delay).toBe(5000);
    expect(job.eligible_at).toBe(job.created_at + 5000);
  });

  it('should throw error if payload is empty', async () => {
    const jobData: JobData = {
      type: 'email',
      payload: {},
    };


    await expect(useCase.execute(jobData)).rejects.toThrow('Payload cannot be empty');
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should throw error if payload is invalid', async () => {
    const jobData: any = {
      type: 'email',
      payload: null,
    };


    await expect(useCase.execute(jobData)).rejects.toThrow('Payload must be a valid object');
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should throw error if delay is negative', async () => {
    const jobData: JobData = {
      type: 'email',
      payload: {
        to: 'test@example.com',
      },
      config: {
        delay: -100,
      },
    };


    await expect(useCase.execute(jobData)).rejects.toThrow(
      'Delay must be a non-negative number'
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should create job with default config when config is not provided', async () => {
    const jobData: JobData = {
      type: 'notification',
      payload: {
        userId: '123',
        message: 'Test notification',
      },
    };

    mockRepository.save.mockImplementation(async (job) => job);

    const job = await useCase.execute(jobData);

    expect(job.config.delay).toBe(0);
    expect(job.eligible_at).toBe(job.created_at);
  });

  it('should handle repository errors', async () => {
    const jobData: JobData = {
      type: 'email',
      payload: {
        to: 'test@example.com',
      },
    };

    mockRepository.save.mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute(jobData)).rejects.toThrow('Database error');
  });
});