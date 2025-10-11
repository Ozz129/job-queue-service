import { CancelJobUseCase, GetJobStatusUseCase, SubmitJobUseCase } from "../../application/usecases";
import { Job, JobRepository } from "../../domain";
import { SubmitJobDTO } from "../dto";
import { Request, Response } from "express";

export class JobController {
  private submitJobUseCase: SubmitJobUseCase;
  private getJobStatusUseCase: GetJobStatusUseCase;
  private cancelJobUseCase: CancelJobUseCase;

  constructor(repository: JobRepository) {
    this.submitJobUseCase = new SubmitJobUseCase(repository);
    this.getJobStatusUseCase = new GetJobStatusUseCase(repository);
    this.cancelJobUseCase = new CancelJobUseCase(repository);
  }

  submitJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobData = SubmitJobDTO.fromRequestBody(req.body);

      const job = await this.submitJobUseCase.execute(jobData);

      res.status(201).json(this.formatJobResponse(job));
    } catch (error) {
      this.handleError(error, res);
    }
  };

  getJobStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobId = req.params.id;
      SubmitJobDTO.validateJobId(jobId);

      const job = await this.getJobStatusUseCase.execute(jobId);

      res.status(200).json(this.formatJobResponse(job));
    } catch (error) {
      this.handleError(error, res);
    }
  };

  cancelJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobId = req.params.id;
      SubmitJobDTO.validateJobId(jobId);

      const job = await this.cancelJobUseCase.execute(jobId);

      res.status(200).json(this.formatJobResponse(job));
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private formatJobResponse(job: Job) {
    return {
      id: job.id,
      status: job.status,
      execution_time: job.execution_time,
      result: job.result,
      data: {
        type: job.type,
        payload: job.payload,
        config: {
          delay: job.config.delay,
        },
      },
      created_at: job.created_at,
      eligible_at: job.eligible_at,
      started_at: job.started_at,
      finished_at: job.finished_at,
    };
  }

  private handleError(error: any, res: Response): void {
    console.error('Error in JobController:', error);

    if (
      error.message.includes('must be') ||
      error.message.includes('required') ||
      error.message.includes('cannot be empty') ||
      error.message.includes('Payload') ||
      error.message.includes('Delay') ||
      error.message.includes('UUID')
    ) {
      res.status(400).json({
        error: 'Bad Request',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('Cannot cancel') || error.message.includes('Cannot start')) {
      res.status(409).json({
        error: 'Conflict',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
}