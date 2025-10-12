import { JobQueue } from '../services/JobQueue';
import { JobFactory } from '../../domain/factories/JobFactory';
import { JobStatus } from '../../domain/value-objects/JobStatus';

jest.mock('uuid', () => ({
  v4: jest.fn(() => `test-uuid-${Math.floor(Math.random() * 10000)}`),
}));

describe('JobQueue', () => {
  let queue: JobQueue;

  beforeEach(() => {
    queue = new JobQueue();
  });

  describe('addJob', () => {
    it('should add a job to the queue', () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });

      queue.addJob(job);

      expect(queue.getTotalJobs()).toBe(1);
      expect(queue.getJobById(job.id)).toEqual(job);
    });

    it('should add multiple jobs', () => {

      const job1 = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test1@example.com' },
      });

      const job2 = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
      });

      queue.addJob(job1);
      queue.addJob(job2);

      expect(queue.getTotalJobs()).toBe(2);
    });
  });

  describe('getNextEligibleJob', () => {
    it('should return undefined when queue is empty', () => {

      const job = queue.getNextEligibleJob();

      expect(job).toBeUndefined();
    });

    it('should return job without delay immediately', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
        config: { delay: 0 },
      });
      queue.addJob(job);

      const eligibleJob = queue.getNextEligibleJob();

      expect(eligibleJob).toEqual(job);
    });

    it('should not return job with future eligible_at', () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
        config: { delay: 10000 }, // 10 segundos en el futuro
      });
      queue.addJob(job);

      const eligibleJob = queue.getNextEligibleJob();

      expect(eligibleJob).toBeUndefined();
    });

    it('should return oldest eligible job (FIFO)', () => {
      const job1 = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test1@example.com' },
        config: { delay: 0 },
      });

      const job2 = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
        config: { delay: 0 },
      });

      queue.addJob(job1);
      queue.addJob(job2);

      const eligibleJob = queue.getNextEligibleJob();

      expect(eligibleJob).toEqual(job1); // El más antiguo
    });

    it('should skip jobs that are not PENDING', () => {

      const job1 = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test1@example.com' },
      });

      const job2 = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
      });

      const runningJob = JobFactory.startJob(job1);

      queue.addJob(runningJob);
      queue.addJob(job2);

      const eligibleJob = queue.getNextEligibleJob();

      expect(eligibleJob).toEqual(job2);
    });
  });

  describe('updateJob', () => {
    it('should update an existing job', () => {

      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });

      queue.addJob(job);

      const runningJob = JobFactory.startJob(job);
      queue.updateJob(runningJob);

      const updatedJob = queue.getJobById(job.id);
      expect(updatedJob?.status).toBe(JobStatus.RUNNING);
    });

    it('should throw error if job does not exist', () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });

      expect(() => queue.updateJob(job)).toThrow('Job with id');
    });
  });

  describe('getJobById', () => {
    it('should return job by id', () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });

      queue.addJob(job);

      const foundJob = queue.getJobById(job.id);

      expect(foundJob).toEqual(job);
    });

    it('should return undefined if job does not exist', () => {
      const foundJob = queue.getJobById('non-existent-id');

      expect(foundJob).toBeUndefined();
    });
  });

  describe('listJobs', () => {
    it('should return all jobs', () => {
      const job1 = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test1@example.com' },
      });

      const job2 = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
      });

      queue.addJob(job1);
      queue.addJob(job2);

      const jobs = queue.listJobs();

      expect(jobs).toHaveLength(2);
    });

    it('should filter jobs by status', () => {
      const job1 = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test1@example.com' },
      });
      
      const job2 = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
      });

      const runningJob = JobFactory.startJob(job1);

      queue.addJob(runningJob);
      queue.addJob(job2);

      const pendingJobs = queue.listJobs({ status: JobStatus.PENDING });
      const runningJobs = queue.listJobs({ status: JobStatus.RUNNING });

      expect(pendingJobs).toHaveLength(1);
      expect(runningJobs).toHaveLength(1);
    });
  });

  describe.only('getJobCounts', () => {
    it('should return counts of jobs by status', () => {

      const job1 = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test1@example.com' },
        config: { delay: 120000 },
      });

      const job2 = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
        config: { delay: 120000 },
      });

      const runningJob = JobFactory.startJob(job1);

      console.log('Running Job 1:', runningJob);

      queue.addJob(runningJob);
      queue.addJob(job2);



      const counts = queue.getJobCounts();

      console.log(counts);
      expect(counts[JobStatus.PENDING]).toBe(1);
      expect(counts[JobStatus.RUNNING]).toBe(1);
      expect(counts[JobStatus.COMPLETED]).toBe(0);
    });
  });

  describe('hasJob', () => {
    it('should return true if job exists', () => {
      const job = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test@example.com' },
      });
      queue.addJob(job);

      const exists = queue.hasJob(job.id);

      expect(exists).toBe(true);
    });

    it('should return false if job does not exist', () => {
      const exists = queue.hasJob('non-existent-id');

      expect(exists).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all jobs from queue', () => {
      const job1 = JobFactory.createJob({
        type: 'email',
        payload: { to: 'test1@example.com' },
      });

      const job2 = JobFactory.createJob({
        type: 'sms',
        payload: { to: '+1234567890' },
      });

      queue.addJob(job1);
      queue.addJob(job2);

      queue.clear();
      expect(queue.getTotalJobs()).toBe(0);
    });
  });
});