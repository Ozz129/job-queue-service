import { Router } from 'express';
import { JobRepository } from '../../../domain';
import { JobController } from '../controllers';

export function createJobRoutes(repository: JobRepository): Router {
  const router = Router();
  const controller = new JobController(repository);

  router.post('/jobs', controller.submitJob);

  router.get('/jobs/:id', controller.getJobStatus);

  router.delete('/jobs/:id', controller.cancelJob);

  return router;
}