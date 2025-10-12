import { createSuccessResult, JobFactory, JobStatus } from '../../../domain';
import { InMemoryJobRepository } from '../InMemoryJobRepository';

jest.mock('uuid', () => {
  let counter = 0;
  return {
    v4: jest.fn(() => `test-uuid-${String(counter++ % 10000).padStart(4, '0')}`),
  };
});


describe('InMemoryJobRepository', () => {
  let repository: InMemoryJobRepository;

  beforeEach(() => {
    repository = new InMemoryJobRepository();
  });

  describe('save', () => {
    it('should save a new job', async () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });

      const savedJob = await repository.save(job);

      expect(savedJob).toEqual(job);
      expect(await repository.exists(job.id)).toBe(true);
    });

    it('should update an existing job', async () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      await repository.save(job);

      // Act - Update to RUNNING
      const runningJob = JobFactory.startJob(job);
      const updatedJob = await repository.save(runningJob);

      expect(updatedJob.status).toBe(JobStatus.RUNNING);
      const foundJob = await repository.findById(job.id);
      expect(foundJob?.status).toBe(JobStatus.RUNNING);
    });

    it('should return the saved job', async () => {
      const job = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
      });

      const result = await repository.save(job);

      expect(result).toBe(job);
    });
  });

  describe('findById', () => {
    it('should find a job by id', async () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      await repository.save(job);

      const foundJob = await repository.findById(job.id);

      expect(foundJob).toEqual(job);
    });

    it('should return null if job does not exist', async () => {
      const foundJob = await repository.findById('non-existent-id');

      expect(foundJob).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all jobs', async () => {
      const job1 = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test1@example.com' },
      });
      const job2 = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
      });

      await repository.save(job1);
      await repository.save(job2);

      const allJobs = await repository.findAll();

      expect(allJobs).toHaveLength(2);
      expect(allJobs).toContainEqual(job1);
      expect(allJobs).toContainEqual(job2);
    });

    it('should return empty array if no jobs', async () => {
      const allJobs = await repository.findAll();

      expect(allJobs).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should filter jobs by status', async () => {
      const job1 = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test1@example.com' },
      });
      const job2 = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
      });

      await repository.save(job1);
      
      const runningJob = JobFactory.startJob(job2);
      await repository.save(runningJob);

      const pendingJobs = await repository.findByStatus(JobStatus.PENDING);
      const runningJobs = await repository.findByStatus(JobStatus.RUNNING);

      expect(pendingJobs).toHaveLength(1);
      expect(pendingJobs[0].id).toBe(job1.id);
      expect(runningJobs).toHaveLength(1);
      expect(runningJobs[0].id).toBe(job2.id);
    });

    it('should return empty array if no jobs with status', async () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      await repository.save(job);

      const completedJobs = await repository.findByStatus(JobStatus.COMPLETED);

      expect(completedJobs).toEqual([]);
    });
  });

  describe('getNextEligible', () => {
    it('should return next eligible job', async () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
        config: { delay: 0 },
      });
      await repository.save(job);

      const eligibleJob = await repository.getNextEligible();

      expect(eligibleJob).toEqual(job);
    });

    it('should return null if no eligible jobs', async () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
        config: { delay: 10000 },
      });
      await repository.save(job);

      const eligibleJob = await repository.getNextEligible();

      expect(eligibleJob).toBeNull();
    });

    it('should return oldest eligible job (FIFO)', async () => {
      const job1 = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test1@example.com' },
        config: { delay: 0 },
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const job2 = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
        config: { delay: 0 },
      });

      await repository.save(job1);
      await repository.save(job2);

      const eligibleJob = await repository.getNextEligible();

      expect(eligibleJob?.id).toBe(job1.id);
    });

    it('should return null if queue is empty', async () => {
      const eligibleJob = await repository.getNextEligible();

      expect(eligibleJob).toBeNull();
    });
  });

  describe('getJobCounts', () => {
    it('should return counts of jobs by status', async () => {
      const job1 = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test1@example.com' },
      });

      const job2 = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
      });

      await repository.save(job1);

      const runningJob = JobFactory.startJob(job2);
      await repository.save(runningJob);

      const counts = await repository.getJobCounts();

      expect(counts[JobStatus.PENDING]).toBe(1);
      expect(counts[JobStatus.RUNNING]).toBe(1);
      expect(counts[JobStatus.COMPLETED]).toBe(0);
      expect(counts[JobStatus.FAILED]).toBe(0);
      expect(counts[JobStatus.CANCELLED]).toBe(0);
    });

    it('should return zero counts for empty repository', async () => {
      const counts = await repository.getJobCounts();

      expect(counts[JobStatus.PENDING]).toBe(0);
      expect(counts[JobStatus.RUNNING]).toBe(0);
      expect(counts[JobStatus.COMPLETED]).toBe(0);
      expect(counts[JobStatus.FAILED]).toBe(0);
      expect(counts[JobStatus.CANCELLED]).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return true if job exists', async () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      await repository.save(job);

      const exists = await repository.exists(job.id);

      expect(exists).toBe(true);
    });

    it('should return false if job does not exist', async () => {
      const exists = await repository.exists('non-existent-id');

      expect(exists).toBe(false);
    });
  });

  describe('count', () => {
    it('should return total number of jobs', async () => {
      const job1 = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test1@example.com' },
      });

      const job2 = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
      });

      await repository.save(job1);
      await repository.save(job2);

      const count = await repository.count();

      expect(count).toBe(2);
    });

    it('should return 0 for empty repository', async () => {
      const count = await repository.count();

      expect(count).toBe(0);
    });
  });

  describe('integration with JobQueue', () => {
    it('should use JobQueue internally', () => {
      expect(repository.getQueue()).toBeDefined();
    });

    it('should clear all jobs', () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      repository.save(job);

      repository.clear();

      expect(repository.getQueue().getTotalJobs()).toBe(0);
    });

    it('should handle multiple operations correctly', async () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });

      await repository.save(job);
      const found = await repository.findById(job.id);
      const exists = await repository.exists(job.id);
      const count = await repository.count();

      expect(found).toEqual(job);
      expect(exists).toBe(true);
      expect(count).toBe(1);
    });
  });

  describe('job lifecycle', () => {
    it('should handle complete job lifecycle', async () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      await repository.save(job);
      expect((await repository.findById(job.id))?.status).toBe(JobStatus.PENDING);
      const runningJob = JobFactory.startJob(job);
      await repository.save(runningJob);
      expect((await repository.findById(job.id))?.status).toBe(JobStatus.RUNNING);

      const completedJob = JobFactory.completeJob(
        runningJob,
        createSuccessResult('Success')
      );
      await repository.save(completedJob);

      const finalJob = await repository.findById(job.id);
      expect(finalJob?.status).toBe(JobStatus.COMPLETED);
      expect(finalJob?.result).toBeDefined();
      expect(finalJob?.execution_time).toBeDefined();
      expect(finalJob?.finished_at).toBeDefined();
    });
  });
});