# Testing Guide

This guide explains how to run all tests for the MiniprojetV0 application.

## Prerequisites

Before running tests, install dependencies for each service:


# Backend NestJS
cd backend_nest && npm install

# Frontend Next.js
cd frontend && npm install

# Blockchain
cd blockchain && npm install


## Running Tests Locally

### All Tests (From Root)

```bash
# Run all tests across all services
npm run test:all

# Run tests with coverage
npm run coverage:all
```

### Backend NestJS Tests

```bash
cd backend_nest

# Unit tests
npm test

# Unit tests with coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

### Frontend Next.js Tests

```bash
cd frontend

#Unit tests
npm test

# Tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Blockchain Tests

```bash
cd blockchain

# Run smart contract tests
npx hardhat test

# With coverage
npx hardhat coverage
```

### Auth Service (Go) Tests

```bash
cd auth

# Run all tests with coverage
go test ./... -v -cover

# Specific package
go test ./internal/auth -v
```

## Integration Tests

Run integration tests using Docker Compose:

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

# Clean up
docker-compose -f docker-compose.test.yml down -v
```

## Security Scans

### NPM Audit

```bash
# Check all services
npm run security:npm

# Or individually
cd backend_nest && npm audit
cd frontend && npm audit
```

### Docker Image Scanning (Trivy)

```bash
# Build images first
docker-compose build

# Run security scan on all images
bash ./security/scan-all.sh

# Or scan a specific image
docker run --rm aquasec/trivy image backend_nest:latest
```

### OWASP ZAP Scan

```bash
# Make sure the application is running first
docker-compose up -d

# Run ZAP scan
bash ./security/zap-scan.sh http://localhost:8000

# View the report
open ./security/reports/zap-report.html
```

## CI/CD Pipelines

The project includes three GitHub Actions workflows:

### CI Pipeline (`.github/workflows/ci.yml`)

Runs automatically on push to `main` or `develop`:
- Unit tests for all services
- E2E tests
- Docker image builds
- Code coverage reporting

### Security Scan (`.github/workflows/security.yml`)

Runs weekly and on manual trigger:
- npm audit for vulnerabilities
- Trivy container scanning
- SARIF reports uploaded to GitHub Security

### Deployment (`.github/workflows/deploy.yml`)

Deploys to AKS on push to `main`:
- Builds Docker images
- Pushes to Azure Container Registry
- Updates Kubernetes deployments
- Verifies rollout status

## GitHub Secrets Required

For CI/CD pipelines to work, configure these secrets in GitHub:

```
AZURE_CREDENTIALS          # Azure service principal
RESOURCE_GROUP            # Azure resource group name
CLUSTER_NAME               # AKS cluster name
ACR_NAME                   # Azure Container Registry name
SUPABASE_URL              # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY # Supabase service role key
STRIPE_SECRET_KEY         # Stripe API secret key
STRIPE_WEBHOOK_SECRET     # Stripe webhook secret
JWT_SECRET                 # JWT signing secret
```

## Test Coverage Goals

- **Backend NestJS**: ≥ 80%
- **Frontend**: ≥ 70%
- **Smart Contracts**: ≥ 90%
- **Auth Service (Go)**: ≥ 80%

## Troubleshooting

### Tests fail with "Cannot find module"

```bash
# Reinstall dependencies
npm ci
```

### Docker tests fail to start

```bash
# Clean up Docker environment
docker-compose -f docker-compose.test.yml down -v
docker system prune -f
```

### Permission denied on shell scripts

```bash
# Make scripts executable
chmod +x security/*.sh
```

## Next Steps

1. Install dependencies: `cd backend_nest && npm install`
2. Run unit tests: `npm test`
3. Fix any failing tests
4. Run security scans
5. Push to GitHub to trigger CI/CD
