# Docker Architecture Documentation

## Overview

This project uses Docker and Docker Compose to orchestrate a microservices architecture. Each service has its own Dockerfile for building container images, and `docker-compose.yml` orchestrates all services together.

---

## Docker Compose Architecture

### Network Structure

All services run on a **bridge network** called `miniprojet-net`, allowing them to communicate using service names as hostnames.

```
┌─────────────────────────────────────────────────────────┐
│              miniprojet-net (bridge network)              │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Frontend │  │ Gateway  │  │   Auth   │  │ Backend │ │
│  │  :3000   │  │  :8000   │  │  :3060   │  │  :5000  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │              │              │             │       │
│       │              │              │             │       │
│       │              │              └──────┬──────┘       │
│       │              │                     │             │
│       │              │              ┌──────▼──────┐      │
│       │              │              │   MySQL     │      │
│       │              │              │   :3306     │      │
│       │              │              └─────────────┘      │
│       │              │                                   │
│       │              │              ┌─────────────┐     │
│       │              │              │   Adminer    │     │
│       │              │              │   :8081      │     │
│       │              │              └─────────────┘     │
│       └──────────────┘                                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Service Breakdown

### 1. MySQL Database (`mysql-db`)

**Image**: `mysql:8.0` (official image)

**Configuration**:
- **Container Name**: `mysql-db`
- **Port Mapping**: `3306:3306` (host:container)
- **Database**: `miniprojet`
- **User**: `melkey` / Password: `megaknight`
- **Root Password**: `evomegaknight`

**Volumes**:
- `mysql_data`: Persistent storage for database files
- `./auth/miniprojet.sql`: Initialization script (runs on first start)

**Health Check**:
- Tests MySQL availability with `mysqladmin ping`
- Timeout: 20s, Retries: 10
- Other services wait for this to be healthy before starting

**Network**: `miniprojet-net`

**Purpose**: Stores user accounts, sessions, and verification codes for the Auth Service

---

### 2. Auth Service (`auth-service`)

**Build**: Custom Dockerfile from `./auth`

**Configuration**:
- **Container Name**: `auth-service`
- **Port Mapping**: `3060:3060`
- **Build Context**: `./auth` directory

**Environment Variables**:
- `PORT`: 3060
- `GATEWAY_URL`: `http://localhost:8000` (for OAuth callbacks)
- `FRONTEND_URL`: `http://localhost:3000`
- **From `.env` file**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, database credentials

**Dependencies**:
- `mysql-db` (waits for health check)

**Network**: `miniprojet-net`

**Internal Communication**:
- Connects to MySQL using service name: `mysql-db:3306`

**Dockerfile Strategy**:
- **Multi-stage build**:
  1. **Builder stage**: Compiles Go application
  2. **Runtime stage**: Minimal Alpine image with just the binary

---

### 3. Backend NestJS (`backend_nest`)

**Build**: Custom Dockerfile from `./backend_nest`

**Configuration**:
- **Container Name**: `backend_nest`
- **Port Mapping**: `5000:5000`

**Environment Variables**:
- `PORT`: 5000
- `SUPABASE_URL`: External Supabase instance
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `NODE_ENV`: production
- `AUTH_SERVICE_URL`: `http://auth-service:3060` (uses service name)
- `GATEWAY_URL`: `http://gateway:8000` (uses service name)

**Network**: `miniprojet-net`

**Internal Communication**:
- Calls Auth Service via: `http://auth-service:3060`
- Calls Gateway via: `http://gateway:8000`
- Connects to external Supabase (not in Docker network)

**Dockerfile Strategy**:
- **Multi-stage build**:
  1. **Builder stage**: Installs dependencies and builds TypeScript
  2. **Production stage**: Only production dependencies, runs compiled code

---

### 4. Gateway (`gateway`)

**Build**: Custom Dockerfile from `./gateway`

**Configuration**:
- **Container Name**: `gateway`
- **Port Mapping**: `8000:8000`

**Environment Variables**:
- `AUTH_SERVICE_URL`: `http://auth-service:3060` (uses service name)
- `BACKEND_SERVICE_URL`: `http://backend_nest:5000` (uses service name)
- `FRONTEND_URL`: `http://localhost:3000` (for CORS)
- `PORT`: 8000

**Dependencies**:
- `auth-service`
- `backend_nest`
- `mysql-db` (waits for all to be ready)

**Network**: `miniprojet-net`

**Internal Communication**:
- Proxies to Auth Service: `http://auth-service:3060`
- Proxies to Backend: `http://backend_nest:5000`

**Dockerfile Strategy**:
- **Multi-stage build**:
  1. **Builder stage**: Compiles Go application
  2. **Runtime stage**: Minimal Alpine image with just the binary

---

### 5. Frontend (`frontend`)

**Build**: Custom Dockerfile from `./frontend` (target: `runner`)

**Configuration**:
- **Container Name**: `frontend`
- **Port Mapping**: `3000:3000`

**Environment Variables**:
- `NEXT_PUBLIC_API_URL`: `http://localhost:8000` (for client-side requests)
- `API_URL`: `http://gateway:8000` (for server-side requests, uses service name)

**Dependencies**:
- `gateway` (waits for gateway to be ready)

**Network**: `miniprojet-net`

**Internal Communication**:
- Server-side API calls use: `http://gateway:8000` (service name)
- Client-side API calls use: `http://localhost:8000` (browser resolves to host)

**Dockerfile Strategy**:
- **Multi-stage build**:
  1. **Dependencies stage**: Installs npm packages
  2. **Builder stage**: Builds Next.js application
  3. **Runner stage**: Minimal runtime with standalone output

**Next.js Configuration**:
- `output: 'standalone'` - Creates optimized standalone build
- API rewrites to Gateway for server-side requests

---

### 6. Adminer (`adminer`)

**Image**: `adminer:latest` (official image)

**Configuration**:
- **Container Name**: `adminer`
- **Port Mapping**: `8081:8080` (Adminer runs on 8080 internally)

**Environment Variables**:
- `ADMINER_DEFAULT_SERVER`: `mysql-db` (pre-fills connection)

**Dependencies**:
- `mysql-db`

**Network**: `miniprojet-net`

**Purpose**: Web-based MySQL administration tool (optional, for development)

**Access**: `http://localhost:8081`

---

## Dockerfile Analysis

### Gateway Dockerfile

```dockerfile
# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./          # Copy dependency files first (layer caching)
RUN go mod download            # Download dependencies
COPY . .                        # Copy source code
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/api

# Runtime stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates  # For HTTPS
WORKDIR /root/
COPY --from=builder /app/main .         # Copy only binary
EXPOSE 8000
CMD ["./main"]
```

**Key Points**:
- **Multi-stage build**: Reduces final image size
- **Layer caching**: Dependencies copied first for better caching
- **Static binary**: `CGO_ENABLED=0` creates static binary (no C dependencies)
- **Minimal runtime**: Alpine Linux (~5MB base image)

---

### Auth Service Dockerfile

```dockerfile
# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/api

# Runtime stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
COPY --from=builder /app/.env .        # Copies .env file
EXPOSE 3060
CMD ["./main"]
```

**Key Points**:
- Similar to Gateway Dockerfile
- **Copies `.env` file**: Environment variables from file
- **Note**: `.env` should be in `.dockerignore` if it contains secrets (better to use `env_file` in docker-compose)

---

### Backend NestJS Dockerfile

```dockerfile
# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci                    # Clean install (faster, reproducible)

COPY . .
RUN npm run build            # Build TypeScript to JavaScript

# Production stage
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache wget  # Utility for health checks

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force  # Production deps only

COPY --from=builder /app/dist ./dist    # Copy compiled code
COPY --from=builder /app/.env ./

EXPOSE 5000
CMD ["node", "dist/main"]
```

**Key Points**:
- **Multi-stage build**: Separates build and runtime
- **Production dependencies only**: `--omit=dev` reduces image size
- **Compiled code**: Runs from `dist/` directory
- **Cache cleaning**: Reduces image size

---

### Frontend Dockerfile

```dockerfile
# Dependencies stage
FROM node:20 AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci                    # Install all dependencies

# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules  # Reuse dependencies
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=8192"  # Increase memory for build
RUN npm run build            # Build Next.js app

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user (security best practice)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./      # Standalone build
COPY --from=builder /app/.next/static ./.next/static

# Set permissions
RUN chown -R nextjs:nodejs /app
USER nextjs                    # Run as non-root user

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"         # Listen on all interfaces
CMD ["node", "server.js"]
```

**Key Points**:
- **Three-stage build**: Dependencies → Build → Runtime
- **Standalone output**: Next.js creates minimal runtime
- **Security**: Runs as non-root user (`nextjs`)
- **Memory optimization**: Increased heap size for build
- **Minimal runtime**: Only copies necessary files

---

## Service Communication Flow

### Internal Communication (Docker Network)

Services communicate using **service names** as hostnames:

```
Frontend (server-side) → Gateway → Auth Service
                              ↓
                         Backend NestJS
                              ↓
                         MySQL (via Auth Service)
```

**Example**:
- Backend NestJS calls Auth Service: `http://auth-service:3060/api/me`
- Gateway proxies to Backend: `http://backend_nest:5000/messages`
- Frontend (server-side) calls: `http://gateway:8000/api/me`

### External Communication

**From Host Machine**:
- Frontend: `http://localhost:3000`
- Gateway: `http://localhost:8000`
- Auth Service: `http://localhost:3060`
- Backend NestJS: `http://localhost:5000`
- MySQL: `localhost:3306`
- Adminer: `http://localhost:8081`

**From Browser**:
- Frontend makes requests to `http://localhost:8000` (Gateway)
- Gateway handles CORS and routes to services

---

## Startup Sequence

Docker Compose starts services in dependency order:

```
1. mysql-db
   └─ Health check passes
   
2. auth-service
   └─ Waits for mysql-db (healthy)
   └─ Connects to mysql-db:3306
   
3. backend_nest
   └─ No explicit dependency (starts in parallel)
   └─ Connects to external Supabase
   
4. gateway
   └─ Waits for: auth-service, backend_nest, mysql-db
   └─ Proxies to auth-service:3060 and backend_nest:5000
   
5. frontend
   └─ Waits for gateway
   └─ Makes requests to gateway:8000
   
6. adminer
   └─ Waits for mysql-db
   └─ Connects to mysql-db for administration
```

---

## Volume Management

### Named Volumes

**`mysql_data`**:
- Type: Named volume (managed by Docker)
- Purpose: Persistent MySQL data storage
- Location: Docker volume storage
- **Survives container deletion** (data persists)

### Bind Mounts

**`./auth/miniprojet.sql:/docker-entrypoint-initdb.d/miniprojet.sql`**:
- Type: Bind mount (host file → container)
- Purpose: Initialize database schema on first start
- **Only runs if database is empty**

---

## Environment Variable Strategy

### Service-Specific Variables

**In docker-compose.yml**:
- Hardcoded values (ports, service URLs)
- Service discovery URLs (using service names)

**In .env files**:
- Secrets (API keys, passwords)
- Configuration that changes per environment

**In Dockerfile**:
- Build-time variables
- Default values

### URL Configuration

**Internal (Docker network)**:
- Use service names: `http://auth-service:3060`
- Resolved by Docker DNS

**External (from host/browser)**:
- Use `localhost`: `http://localhost:8000`
- Resolved by host machine

**Frontend Special Case**:
- `NEXT_PUBLIC_API_URL`: Client-side (browser) → `localhost:8000`
- `API_URL`: Server-side (Next.js) → `gateway:8000` (service name)

---

## Network Isolation

All services are on `miniprojet-net`:
- **Isolated**: Services can only communicate with each other
- **Service Discovery**: Docker DNS resolves service names
- **Security**: No external access except through exposed ports

---

## Port Mapping Strategy

| Service | Internal Port | External Port | Purpose |
|---------|---------------|---------------|---------|
| Frontend | 3000 | 3000 | Web UI |
| Gateway | 8000 | 8000 | API Gateway |
| Auth Service | 3060 | 3060 | Authentication |
| Backend NestJS | 5000 | 5000 | Business Logic |
| MySQL | 3306 | 3306 | Database |
| Adminer | 8080 | 8081 | DB Admin |

**Note**: External ports can be changed without affecting internal communication.

---

## Build Process

### Building All Services

```bash
docker-compose build
```

**Process**:
1. Reads each service's `Dockerfile`
2. Builds images in parallel (where possible)
3. Caches layers for faster rebuilds
4. Tags images with service names

### Building Specific Service

```bash
docker-compose build gateway
```

### Rebuilding After Changes

```bash
docker-compose build --no-cache gateway  # Force rebuild
```

---

## Running the Stack

### Start All Services

```bash
docker-compose up
```

**Or in detached mode**:
```bash
docker-compose up -d
```

### Start Specific Services

```bash
docker-compose up mysql-db auth-service
```

### View Logs

```bash
docker-compose logs -f gateway
```

### Stop Services

```bash
docker-compose down
```

**With volumes** (removes MySQL data):
```bash
docker-compose down -v
```

---

## Health Checks

### MySQL Health Check

```yaml
healthcheck:
  test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
  timeout: 20s
  retries: 10
```

**Purpose**: Ensures MySQL is ready before dependent services start.

**Other Services**: Could add health checks for better orchestration.

---

## Security Considerations

### Current Setup

✅ **Good Practices**:
- Non-root user in Frontend container
- Network isolation
- Environment variables for secrets
- Minimal runtime images (Alpine)

⚠️ **Improvements Needed**:
- `.env` files should not be copied into images (use `env_file` in docker-compose)
- Secrets should use Docker secrets or external secret management
- Consider read-only filesystems for containers
- Add health checks to all services

---

## Troubleshooting

### Service Can't Connect to Another

**Check**:
1. Both services on same network: `miniprojet-net`
2. Using correct service name (not `localhost`)
3. Service is running: `docker-compose ps`
4. Port is correct in environment variables

### Database Connection Issues

**Check**:
1. MySQL health check passed
2. Correct credentials in `.env`
3. Service name: `mysql-db` (not `localhost`)
4. Port: `3306` (internal, not mapped port)

### Frontend Can't Reach Gateway

**Check**:
1. Gateway is running
2. `NEXT_PUBLIC_API_URL` is `http://localhost:8000` (for browser)
3. `API_URL` is `http://gateway:8000` (for server-side)
4. Next.js rewrites are configured correctly

---

## Summary

The Docker architecture provides:

1. **Isolation**: Each service in its own container
2. **Orchestration**: Docker Compose manages dependencies
3. **Networking**: Service discovery via Docker DNS
4. **Persistence**: Named volumes for data
5. **Optimization**: Multi-stage builds for small images
6. **Development**: Easy local setup with one command

**Key Design Decisions**:
- **Service names** for internal communication
- **Multi-stage builds** for optimized images
- **Health checks** for reliable startup
- **Network isolation** for security
- **Volume persistence** for data

This setup allows the entire stack to run with a single command: `docker-compose up`

