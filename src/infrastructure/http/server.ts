import express, { Application } from 'express';
import { jobWorker } from '../../application/services';
import { createJobRoutes } from '../../interfaces/routes';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

export function createApp(): Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true })); 

  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      worker: {
        running: jobWorker.isRunning(),
      },
    });
  });

  const repository = jobWorker.getRepository();
  const jobRoutes = createJobRoutes(repository);
  app.use('/', jobRoutes);

  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  return app;
}

export function startServer(): void {
  const app = createApp();

  console.log('Initializing JobWorker...');
  jobWorker.start();

  const server = app.listen(PORT, () => {
    console.log('Job Queue Service started successfully');
    console.log(`Server listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });

  const gracefulShutdown = () => {
    console.log('Received shutdown signal, closing gracefully...');

    server.close(() => {
      console.log('HTTP server closed');

      jobWorker.stop();

      console.log('Shutdown complete');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown();
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown();
  });
}