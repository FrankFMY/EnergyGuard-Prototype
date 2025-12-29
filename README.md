# KASTOR IoT

[![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2-FF3E00?logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Bun](https://img.shields.io/badge/Bun-1.1+-000000?logo=bun&logoColor=white)](https://bun.sh/)

**Industrial IoT Dashboard for Gas Power Plant Monitoring**

Real-time monitoring and analytics platform for gas-powered engines (Jenbacher J420/J624). Features live telemetry visualization, predictive maintenance forecasting, financial loss tracking, OEE metrics, and comprehensive alert management.

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/FrankFMY/kastor-IoT.git
cd kastor-IoT

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Start infrastructure (TimescaleDB, Redis, EMQX)
bun run db:start

# Apply database migrations
bun run db:push

# Seed demo data
bun run db:seed

# Start development server
bun run dev
```

Open [http://localhost:5173](http://localhost:5173)

**Demo credentials:**

- Admin: `admin@kastor.io` / `demo1234`
- Operator: `operator@kastor.io` / `demo1234`
- Technician: `technician@kastor.io` / `demo1234`

---

## Tech Stack

| Category             | Technologies                                                      |
| -------------------- | ----------------------------------------------------------------- |
| **Frontend**         | Svelte 5 (runes), SvelteKit 2.49, TailwindCSS v4                  |
| **Backend**          | Drizzle ORM 0.45, PostgreSQL 16 / TimescaleDB                     |
| **Auth**             | Better-Auth with Argon2 password hashing                          |
| **Caching**          | Redis with in-memory fallback                                     |
| **Real-time**        | MQTT (EMQX 5.3), Server-Sent Events (SSE) with diff-based updates |
| **Visualization**    | ECharts 6 (tree-shaking optimized), svelte-echarts                |
| **UI**               | lucide-svelte (icons), svelte-motion (animations)                 |
| **Validation**       | Zod 4 (runtime type checking)                                     |
| **i18n**             | svelte-i18n (Russian / English)                                   |
| **Testing**          | Vitest, Playwright                                                |
| **Observability**    | Prometheus metrics, structured logging                            |
| **Containerization** | Docker Compose                                                    |

---

## Environment Variables

Create `.env` file (see `.env.example`):

```env
# Database
DATABASE_URL=postgres://root:mysecretpassword@localhost:5444/local

# Redis (optional - falls back to in-memory cache)
REDIS_URL=redis://localhost:6379

# MQTT
MQTT_ADMIN_PASSWORD=admin_password_here

# Authentication
AUTH_SECRET=your-auth-secret-at-least-32-chars
PUBLIC_AUTH_URL=http://localhost:5173
```

---

## Architecture

### System Overview

```mermaid
flowchart TB
    subgraph client [Client Layer]
        Browser[Browser PWA]
        SSE[SSE Real-time Stream]
    end

    subgraph app [SvelteKit Application]
        Auth[Better-Auth]
        RateLimit[Rate Limiter]

        subgraph pages [Pages - 15+ Routes]
            Dashboard[Dashboard]
            Alerts[Alerts]
            WorkOrders[Work Orders]
            Analytics[Analytics]
            Admin[Admin]
        end

        subgraph components [Component Library]
            UIComponents[UI Components]
            ErrorBoundary[Error Boundary]
        end
    end

    subgraph services [Services Layer]
        Cache[Redis Cache]

        subgraph backend [Server Services]
            EngineSvc[Engine Service]
            AlertSvc[Alert Service]
            WorkOrderSvc[WorkOrder Service]
            UserSvc[User Service]
        end
    end

    subgraph data [Data Layer]
        Drizzle[Drizzle ORM]
        Metrics[Prometheus Metrics]
    end

    subgraph infra [Infrastructure]
        TimescaleDB[(TimescaleDB)]
        Redis[(Redis)]
        EMQX[EMQX MQTT Broker]
    end

    Browser --> Auth
    Auth --> pages
    SSE --> Dashboard
    pages --> backend
    backend --> Cache
    backend --> Drizzle
    Drizzle --> TimescaleDB
    Cache --> Redis
    EMQX -.-> backend
```

---

## API Endpoints

### Public Endpoints

| Endpoint       | Method | Description                     |
| -------------- | ------ | ------------------------------- |
| `/api/status`  | GET    | Dashboard data with caching     |
| `/api/events`  | GET    | SSE stream (diff-based updates) |
| `/api/health`  | GET    | Health check (DB, Redis)        |
| `/api/metrics` | GET    | Prometheus metrics              |

### Authentication

| Endpoint      | Method | Description                                     |
| ------------- | ------ | ----------------------------------------------- |
| `/api/auth/*` | ALL    | Better-Auth endpoints (login, register, logout) |

### Protected Endpoints (require authentication)

| Endpoint                       | Method             | Description               |
| ------------------------------ | ------------------ | ------------------------- |
| `/api/alerts`                  | GET, POST          | List/create alerts        |
| `/api/alerts/:id`              | GET, PATCH         | Get/update alert          |
| `/api/alerts/stats`            | GET                | Alert statistics          |
| `/api/alerts/rules`            | GET, POST          | Alert rules CRUD          |
| `/api/alerts/rules/:id`        | GET, PATCH, DELETE | Rule operations           |
| `/api/alerts/rules/:id/toggle` | PATCH              | Toggle rule enabled       |
| `/api/workorders`              | GET, POST          | List/create work orders   |
| `/api/workorders/:id`          | GET, PATCH, DELETE | Work order operations     |
| `/api/workorders/stats`        | GET                | Work order statistics     |
| `/api/users`                   | GET, POST          | User management (admin)   |
| `/api/users/:id`               | GET, PATCH, DELETE | User operations (admin)   |
| `/api/engines`                 | GET, POST          | Engine management (admin) |
| `/api/engines/:id`             | GET, PATCH, DELETE | Engine operations (admin) |

---

## Database Schema

### Core Tables

| Table       | Description                             |
| ----------- | --------------------------------------- |
| `engines`   | Engine records with status              |
| `telemetry` | Time-series telemetry data (hypertable) |
| `events`    | System event log                        |
| `downtimes` | Engine downtime tracking                |

### Authentication Tables (Better-Auth)

| Table           | Description               |
| --------------- | ------------------------- |
| `users`         | User accounts with roles  |
| `sessions`      | Active sessions           |
| `accounts`      | OAuth/credential accounts |
| `verifications` | Email verification tokens |

### Business Tables

| Table                   | Description                  |
| ----------------------- | ---------------------------- |
| `alerts`                | Active and historical alerts |
| `alert_rules`           | Alert rule configuration     |
| `work_orders`           | Maintenance work orders      |
| `audit_logs`            | User action audit trail      |
| `spare_parts`           | Parts inventory              |
| `maintenance_schedules` | Maintenance planning         |
| `cost_records`          | Cost tracking                |

---

## User Roles

| Role         | Permissions                                      |
| ------------ | ------------------------------------------------ |
| `admin`      | Full access, user management, system config      |
| `operator`   | Create/manage alerts, work orders, view all data |
| `technician` | Manage assigned work orders, acknowledge alerts  |
| `viewer`     | Read-only access to dashboards                   |

---

## Application Routes

| Route           | Module               | Access    |
| --------------- | -------------------- | --------- |
| `/`             | Dashboard            | All       |
| `/login`        | Login                | Public    |
| `/register`     | Registration         | Public    |
| `/engine/[id]`  | Engine Details       | All       |
| `/maintenance`  | Maintenance Forecast | All       |
| `/analytics`    | Business Analytics   | All       |
| `/economics`    | Economics            | All       |
| `/alerts`       | Alert Center         | All       |
| `/alerts/rules` | Alert Rules          | Operator+ |
| `/work-orders`  | Work Orders          | All       |
| `/admin`        | Admin Panel          | Admin     |
| `/comparison`   | Engine Comparison    | All       |
| `/calendar`     | Maintenance Calendar | All       |
| `/reports`      | Reports              | Operator+ |
| `/settings`     | Settings             | All       |
| `/integrations` | Integrations         | Admin     |
| `/dashboards`   | Custom Dashboards    | All       |

---

## Available Scripts

| Script              | Description                 |
| ------------------- | --------------------------- |
| `bun run dev`       | Start development server    |
| `bun run build`     | Build for production        |
| `bun run preview`   | Preview production build    |
| `bun run check`     | TypeScript type checking    |
| `bun run lint`      | Run ESLint + Prettier       |
| `bun run test`      | Run all tests               |
| `bun run test:unit` | Run unit tests (watch)      |
| `bun run test:e2e`  | Run E2E tests (Playwright)  |
| `bun run db:start`  | Start Docker infrastructure |
| `bun run db:stop`   | Stop Docker infrastructure  |
| `bun run db:push`   | Apply schema changes        |
| `bun run db:seed`   | Seed demo data              |
| `bun run db:studio` | Open Drizzle Studio         |

---

## Docker Deployment

### Using Docker Compose

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Services Started

| Service     | Port              | Description                 |
| ----------- | ----------------- | --------------------------- |
| TimescaleDB | 5444              | PostgreSQL with time-series |
| Redis       | 6379              | Caching layer               |
| EMQX        | 1883, 8083, 18083 | MQTT broker + dashboard     |

### Building Application Image

```bash
docker build -t kastor-iot .
docker run -p 3000:3000 --env-file .env kastor-iot
```

---

## Observability

### Prometheus Metrics

Access metrics at `/api/metrics`:

```
# Request metrics
kastor_http_requests_total{method="GET",path="/api/status"} 1234
kastor_http_request_duration_seconds_bucket{le="0.1"} 1000

# SSE metrics
kastor_sse_connections_active 5
kastor_sse_messages_total 5000

# MQTT metrics
kastor_mqtt_messages_total 10000
kastor_mqtt_connection_status 1

# Business metrics
kastor_engines_online 4
kastor_alerts_active 2
```

### Health Check

Access at `/api/health`:

```json
{
	"status": "healthy",
	"timestamp": "2024-12-29T10:00:00Z",
	"services": {
		"database": "healthy",
		"redis": "healthy"
	}
}
```

### Structured Logging

In production, logs are output as JSON:

```json
{
	"level": "info",
	"message": "MQTT message received",
	"timestamp": "2024-12-29T10:00:00Z",
	"context": { "topic": "engines/gpu-1/telemetry" }
}
```

---

## Security Features

- **Authentication**: Better-Auth with Argon2 password hashing
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: API endpoint protection
- **MQTT Security**: Password-based authentication (anonymous disabled)
- **Audit Logging**: User action tracking
- **Input Validation**: Zod schemas on all endpoints

---

## Performance Optimizations

- **ECharts Tree-Shaking**: Only used chart components are bundled
- **Redis Caching**: Frequently accessed data cached
- **SSE Diff Updates**: Only changed data sent to clients
- **TimescaleDB**: Hypertables with compression for telemetry
- **Continuous Aggregates**: Pre-computed hourly statistics

---

## Testing

```bash
# Unit tests
bun run test

# E2E tests (requires running server)
bun run test:e2e

# Coverage report
bun run test:coverage
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run linting and tests
5. Submit a pull request

---

## Author

**Прянишников Артём Алексеевич**

- Email: [Pryanishnikovartem@gmail.com](mailto:Pryanishnikovartem@gmail.com)
- Telegram: [@FrankFMY](https://t.me/FrankFMY)
- GitHub: [FrankFMY](https://github.com/FrankFMY)

---

## License

This project is proprietary software. All rights reserved.

---

Built with Svelte 5, SvelteKit, TailwindCSS & Bun
