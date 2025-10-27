import { JobConfig, JobData } from "../../../domain";

export class SubmitJobDTO {
  static fromRequestBody(body: any): JobData {
    if (!body || typeof body !== 'object') {
      throw new Error('Request body must be a valid object');
    }

    if (!body.type || typeof body.type !== 'string') {
      throw new Error('Field "type" is required and must be a string');
    }

    if (body.type.trim().length === 0) {
      throw new Error('Field "type" cannot be empty');
    }

    if (!body.payload || typeof body.payload !== 'object') {
      throw new Error('Field "payload" is required and must be an object');
    }

    let config: JobConfig | undefined = undefined;
    if (body.config !== undefined) {
      if (typeof body.config !== 'object' || body.config === null) {
        throw new Error('Field "config" must be an object');
      }

      if (body.config.delay !== undefined) {
        if (typeof body.config.delay !== 'number') {
          throw new Error('Field "config.delay" must be a number');
        }

        if (body.config.delay < 0) {
          throw new Error('Field "config.delay" must be non-negative');
        }

        config = { delay: body.config.delay };
      }
    }

    return {
      type: body.type.trim(),
      payload: body.payload,
      config,
    };
  }

  static validateJobId(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new Error('Job ID must be a valid string');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      throw new Error('Job ID must be a valid UUID');
    }
  }
}