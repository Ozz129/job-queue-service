import { Job } from '../../domain/entities/Job';
import { JobStatus } from '../../domain/value-objects/JobStatus';
import { JobQueue } from '../../application/services/JobQueue';
import { JobRepository } from '../../domain';

/**
 * InMemoryJobRepository
 * 
 * Implementación in-memory del repositorio de jobs.
 * Usa JobQueue internamente para gestionar los jobs.
 * 
 * Características:
 * - Persistencia en memoria (no sobrevive reinicios)
 * - Rápido acceso O(1) para operaciones por ID
 * - Ideal para desarrollo y testing
 * 
 * Nota: Todos los métodos son async para mantener
 * compatibilidad con futuras implementaciones que
 * usen bases de datos (async por naturaleza)
 */
export class InMemoryJobRepository implements JobRepository {
  private jobQueue: JobQueue;

  constructor() {
    this.jobQueue = new JobQueue();
  }

  /**
   * Guarda un job (nuevo o actualización)
   * 
   * Si el job ya existe (por ID), lo actualiza.
   * Si no existe, lo agrega como nuevo.
   */
  async save(job: Job): Promise<Job> {
    if (this.jobQueue.hasJob(job.id)) {
      // Actualizar job existente
      this.jobQueue.updateJob(job);
    } else {
      // Agregar nuevo job
      this.jobQueue.addJob(job);
    }

    return job;
  }

  /**
   * Busca un job por su ID
   * 
   * @returns Job encontrado o null
   */
  async findById(jobId: string): Promise<Job | null> {
    const job = this.jobQueue.getJobById(jobId);
    return job || null;
  }

  /**
   * Lista todos los jobs
   */
  async findAll(): Promise<Job[]> {
    return this.jobQueue.listJobs();
  }

  /**
   * Filtra jobs por estado
   */
  async findByStatus(status: JobStatus): Promise<Job[]> {
    return this.jobQueue.listJobs({ status });
  }

  /**
   * Obtiene el siguiente job elegible para ejecutar
   * 
   * @returns Job elegible o null si no hay
   */
  async getNextEligible(): Promise<Job | null> {
    const job = this.jobQueue.getNextEligibleJob();
    return job || null;
  }

  /**
   * Obtiene el conteo de jobs por estado
   */
  async getJobCounts(): Promise<Record<JobStatus, number>> {
    return this.jobQueue.getJobCounts();
  }

  /**
   * Verifica si existe un job
   */
  async exists(jobId: string): Promise<boolean> {
    return this.jobQueue.hasJob(jobId);
  }

  /**
   * Obtiene el total de jobs
   */
  async count(): Promise<number> {
    return this.jobQueue.getTotalJobs();
  }

  /**
   * Expone el JobQueue interno
   * Útil para testing y acceso directo cuando sea necesario
   * 
   * @internal
   */
  getQueue(): JobQueue {
    return this.jobQueue;
  }

  /**
   * Limpia todos los jobs del repositorio
   * Útil para testing
   * 
   * @internal
   */
  clear(): void {
    this.jobQueue.clear();
  }
}