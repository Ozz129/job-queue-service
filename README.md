# Job Queue Service

A robust, TypeScript-based job queue service with in-memory storage, built following Clean Architecture principles.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Docker](#docker)
- [Project Structure](#project-structure)
- [Technical Decisions](#technical-decisions)

## Features

- ✅ **In-memory job queue** with FIFO ordering
- ✅ **Delayed job execution** with configurable delays
- ✅ **Automatic job processing** with 100-2000ms execution time
- ✅ **Failure simulation** (10% random failure rate)
- ✅ **Job lifecycle management** (PENDING → RUNNING → COMPLETED/FAILED/CANCELLED)
- ✅ **RESTful API** with proper HTTP status codes
- ✅ **Clean Architecture** with clear separation of concerns
- ✅ **100% deterministic tests** with high coverage
- ✅ **Docker support** with multi-stage builds
- ✅ **TypeScript** for type safety

## Architecture

The project follows **Clean Architecture** principles with clear layer separation:

```
┌─────────────────────────────────────┐
│   Infrastructure Layer              │
│   - HTTP (Express)                  │
│   - Repositories                    │
└─────────────────────────────────────┘
            ↓ depends on
┌─────────────────────────────────────┐
│   Application Layer                 │
│   - Use Cases                       │
│   - Services (Executor, Processor)  │
└─────────────────────────────────────┘
            ↓ depends on
┌─────────────────────────────────────┐
│   Domain Layer                      │
│   - Entities                        │
│   - Value Objects                   │
│   - Factories                       │
└─────────────────────────────────────┘
```

### Key Components

- **JobFactory**: Handles job creation and state transitions
- **JobQueue**: In-memory queue with FIFO + delay logic
- **JobExecutor**: Simulates job execution (100-2000ms, 10% failure)
- **JobProcessor**: Continuous processing loop (50ms polling)
- **JobWorker**: Singleton orchestrator integrating all services
- **Use Cases**: Business logic (Submit, GetStatus, Cancel)
- **Repository Pattern**: Abstraction over data persistence

## Requirements

- **Node.js**: 18.x or higher
- **npm**: 8.x or higher
- **TypeScript**: 5.x

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Ozz129/job-queue-service.git
cd job-queue-service
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the project

```bash
npm run build
```

### 4. Start the service

```bash
npm start
```

The service will start on **port 52646**.

## Usage

### Development Mode

Run in development mode with auto-reload:

```bash
npm run dev
```

### Production Mode

Build and run in production:

```bash
npm run build
npm start
```

## API Endpoints

### Health Check

```http
GET /health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2025-10-12T...",
  "worker": {
    "running": true
  }
}
```

---

### Create a Job

```http
POST /jobs
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "email",
  "payload": {
    "to": "user@example.com",
    "from": "system@app.com",
    "subject": "Welcome!",
    "body": "Thanks for joining!"
  },
  "config": {
    "delay": 3000
  }
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "execution_time": null,
  "result": null,
  "data": {
    "type": "email",
    "payload": { ... },
    "config": { "delay": 3000 }
  },
  "created_at": 1697040000000,
  "eligible_at": 1697040003000,
  "started_at": null,
  "finished_at": null
}
```

**Fields:**
- `type` (required): Job type (e.g., "email", "sms", "notification")
- `payload` (required): Job-specific data (must be non-empty object)
- `config.delay` (optional): Delay in milliseconds before execution (default: 0)

---

### Get Job Status

```http
GET /jobs/:id
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "execution_time": 1523,
  "result": {
    "message": "Email sent successfully!",
    "data": {
      "jobType": "email",
      "processedAt": 1697040001523
    }
  },
  "data": { ... },
  "created_at": 1697040000000,
  "eligible_at": 1697040000000,
  "started_at": 1697040000000,
  "finished_at": 1697040001523
}
```

**Status Values:**
- `pending`: Waiting to be executed
- `running`: Currently executing
- `completed`: Successfully completed
- `failed`: Execution failed
- `cancelled`: Cancelled by user

---

### Cancel a Job

```http
DELETE /jobs/:id
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "cancelled",
  "result": {
    "message": "Job was cancelled",
    "code": 499
  },
  ...
}
```

**Note:** Only jobs in `pending` status can be cancelled.

---

### Error Responses

**400 Bad Request:**
```json
{
  "error": "Bad Request",
  "message": "Field 'payload' is required and must be an object"
}
```

**404 Not Found:**
```json
{
  "error": "Not Found",
  "message": "Job with id ... not found"
}
```

**409 Conflict:**
```json
{
  "error": "Conflict",
  "message": "Cannot cancel job in running status"
}
```

## Testing

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Generate coverage report

```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory.

### Test Suite

The project includes **100+ deterministic unit tests** with coverage of:

| Metric            | Coverage | Status    |
|-------------------|----------|-----------|
| **Statements**    | ~62%.    | ✅        |
| **Branches**.     | ~52%     | ✅        |
| **Functions**     | ~74%     | ✅        |
| **Lines**         | ~62%     | ✅        |

**All tests are deterministic:**
- No flaky tests
- Controlled time with `jest.useFakeTimers()`
- Mocked randomness for predictable results
- 100% reproducible

## Docker

### Build and run with Docker Compose (Recommended)

```bash
# Build and start the service
docker-compose up -d --build
```

### Check service status

```bash
# View running containers
docker ps

# Check container status with Docker Compose
docker-compose ps

# Check health status (requires jq)
docker inspect --format='{{json .State.Health}}' job-queue-service | jq
```

### View logs

```bash
# Follow logs in real-time
docker-compose logs -f job-queue-service
```

### Stop the service

```bash
docker-compose down
```

---

### Alternative: Build and run with Docker CLI

```bash
# Build the image
docker build -t job-queue-service:latest .

# Run the container
docker run -d \
  --name job-queue-service \
  -p 52646:52646 \
  job-queue-service:latest
```

### Docker Features

- ✅ Multi-stage build for minimal image size (~150MB)
- ✅ Non-root user for security
- ✅ Health check included (checks every 30s)
- ✅ Alpine-based for small footprint

## Project Structure

```
job-queue-service/
├── src/
│   ├── domain/                      # Domain layer (entities, value objects)
│   │   ├── entities/
│   │   │   └── Job.ts
│   │   ├── factories/
│   │   │   └── JobFactory.ts
│   │   ├── value-objects/
│   │   │   ├── JobStatus.ts
│   │   │   ├── JobConfig.ts
│   │   │   ├── JobPayload.ts
│   │   │   └── JobResult.ts
│   │
│   ├── application/                 # Application layer (use cases, services)
│   │   ├── services/
│   │   │   ├── JobExecutor.ts
│   │   │   ├── JobQueue.ts
│   │   │   ├── JobProcessor.ts
│   │   │   ├── JobWorker.ts
│   │   │   └── worker.ts
│   │   ├── usecases/
│   │   │   ├── SubmitJobUseCase.ts
│   │   │   ├── GetJobStatusUseCase.ts
│   │   │   └── CancelJobUseCase.ts
│   │
│   ├── infrastructure/              # Infrastructure layer (HTTP, repositories)
│   │   ├── repositories/
│   │   │   └── InMemoryJobRepository.ts
│   │   └── http/
│   │       ├── dtos/
│   │       │   └── SubmitJobDTO.ts
│   │       ├── controllers/
│   │       │   └── JobController.ts
│   │       ├── routes/
│   │       │   └── jobRoutes.ts
│   │       └── server.ts
│   │
│   └── index.ts                     # Application entry point
│
├── .gitignore
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Technical Decisions

### Why Clean Architecture?

- **Testability**: Easy to test each layer independently
- **Maintainability**: Clear separation of concerns
- **Flexibility**: Easy to swap implementations (e.g., in-memory → database)
- **Scalability**: Well-structured for future growth

### Why In-Memory Storage?

- Required by the challenge specifications
- Fast and simple for this use case
- Easy to test without external dependencies
- Could be replaced with Redis/Database using Repository pattern

### Why Repository Pattern?

- Abstracts data persistence
- Allows easy migration to different storage solutions
- Follows Dependency Inversion Principle
- Makes testing easier with mocks

### Why Singleton JobWorker?

- Ensures only one processor runs at a time
- Prevents race conditions
- Single source of truth for the queue
- Simplifies lifecycle management

## License

ISC

## Author

Developed as part of Kamin Backend Engineer Take-Home Challenge

---

## Quick Start

```bash
# Install
npm install

# Run tests
npm test

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Or use Docker
docker-compose up -d
```

**Service will be available at: http://localhost:52646**

---
