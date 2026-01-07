# KASTOR IoT

[![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2-FF3E00?logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Bun](https://img.shields.io/badge/Bun-1.1+-000000?logo=bun&logoColor=white)](https://bun.sh/)

**Industrial IoT Dashboard for Gas Power Plant Monitoring**

Real-time monitoring and analytics platform for gas-powered engines (Weichai 16VCN, Yuchai YC16V, Jenbacher J620). Features live telemetry visualization, predictive maintenance forecasting, financial loss tracking, OEE metrics, and comprehensive alert management.

---

## Features

- **Real-time Dashboard** — Live telemetry from 6 gas engines via MQTT/SSE
- **Fleet Monitoring** — Status overview, power output, efficiency metrics
- **Alert System** — Configurable rules, severity levels, acknowledgment workflow
- **Work Orders** — Maintenance task management with priority and assignment
- **Analytics** — ROI tracking, cost savings, downtime analysis
- **OEE Metrics** — Overall Equipment Effectiveness with gas consumption tracking
- **Predictive Maintenance** — Service scheduling based on engine hours
- **Multi-language** — Russian and English interface (svelte-i18n)
- **PWA Ready** — Installable, offline-capable progressive web app
- **Role-based Access** — Admin, Operator, Technician, Viewer roles

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
# Edit .env with your configuration

# Start infrastructure (TimescaleDB, Redis, EMQX)
bun run db:start

# Apply database migrations
bun run db:push

# Apply TimescaleDB optimizations (optional, for production)
# Run drizzle/0003_timescale_optimization.sql manually in psql

# Seed demo data
bun run db:seed

# Start development server
bun run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Running the Simulator

To generate live telemetry data:

```bash
# In a separate terminal
bun scripts/mock-device.ts
```

This simulates 6 engines with realistic data patterns including a failure scenario on GPU-2.

---

## Tech Stack

| Category             | Technologies                                                      |
| -------------------- | ----------------------------------------------------------------- |
| **Frontend**         | Svelte 5 (runes), SvelteKit 2.49, TailwindCSS v4                  |
| **Backend**          | Drizzle ORM 0.45, PostgreSQL 17 / TimescaleDB                     |
| **Auth**             | Better-Auth with Argon2 password hashing                          |
| **Caching**          | Redis 7 with in-memory fallback                                   |
| **Real-time**        | MQTT (EMQX 6.0), Server-Sent Events (SSE) with diff-based updates |
| **Visualization**    | ECharts 6 (tree-shaking optimized), svelte-echarts                |
| **UI**               | lucide-svelte (icons), svelte-motion (animations)                 |
| **Validation**       | Zod 4 (runtime type checking)                                     |
| **i18n**             | svelte-i18n (Russian / English)                                   |
| **Testing**          | Vitest, Playwright                                                |
| **Observability**    | Prometheus metrics, structured logging                            |
| **Containerization** | Docker Compose                                                    |

---

## Environment Variables

Create `.env` file based on `.env.example`:

```env
# Database
DATABASE_URL=postgres://user:password@localhost:5432/kastor

# MQTT Broker
MQTT_URL=mqtt://localhost:1883
MQTT_USERNAME=kastor_app
MQTT_PASSWORD=your_mqtt_password

# Redis (optional - falls back to in-memory cache)
REDIS_URL=redis://:your_redis_password@localhost:6379

# Authentication (REQUIRED for production!)
BETTER_AUTH_SECRET=generate-a-secure-32-char-string-here

# CORS / Trusted Origins
TRUSTED_ORIGINS=https://your-domain.com

# Environment
NODE_ENV=production
```

---

## Architecture

### System Overview

```mermaid
flowchart TB
    subgraph devices [Field Devices]
        Modbus[Modbus RTU/TCP]
        Sensors[Engine Sensors]
    end

    subgraph broker [Message Broker]
        EMQX[EMQX MQTT]
    end

    subgraph app [SvelteKit Application]
        Hooks[Server Hooks]
        SSE[SSE Endpoint]
        API[REST API]
        Auth[Better-Auth]
    end

    subgraph storage [Data Storage]
        TimescaleDB[(TimescaleDB)]
        Redis[(Redis Cache)]
    end

    subgraph client [Client]
        Browser[Browser PWA]
    end

    Sensors --> Modbus
    Modbus --> EMQX
    EMQX --> Hooks
    Hooks --> TimescaleDB
    Hooks --> Redis
    API --> TimescaleDB
    API --> Redis
    SSE --> Browser
    API --> Browser
    Auth --> Browser
```

### Data Flow

1. **Telemetry Ingestion**: Engine sensors → Modbus → MQTT → SvelteKit hooks → TimescaleDB
2. **Real-time Updates**: TimescaleDB → SSE endpoint → Browser (every 5 seconds)
3. **Caching**: Frequently accessed data cached in Redis with 2-30 second TTL
4. **Alert Processing**: Threshold violations trigger alert creation with 60-second cooldown

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

### TimescaleDB Features

- **Hypertables**: Telemetry table partitioned by time (1-day chunks)
- **Compression**: Data older than 7 days automatically compressed
- **Retention**: Data older than 90 days automatically dropped
- **Continuous Aggregates**: Pre-computed hourly and daily statistics

---

## API Endpoints

### Public Endpoints

| Endpoint       | Method | Description                     |
| -------------- | ------ | ------------------------------- |
| `/api/status`  | GET    | Dashboard data with caching     |
| `/api/events`  | GET    | SSE stream (diff-based updates) |
| `/api/health`  | GET    | Health check (DB status)        |
| `/api/metrics` | GET    | Prometheus metrics              |

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
| `/api/users`                   | GET                | User management (admin)   |
| `/api/users/:id`               | PATCH, DELETE      | User operations (admin)   |
| `/api/engines`                 | GET, POST          | Engine management (admin) |
| `/api/engines/:id`             | GET, PATCH, DELETE | Engine operations (admin) |

---

## User Roles

| Role         | Permissions                                      |
| ------------ | ------------------------------------------------ |
| `admin`      | Full access, user management, system config      |
| `operator`   | Create/manage alerts, work orders, view all data |
| `technician` | Manage assigned work orders, acknowledge alerts  |
| `viewer`     | Read-only access to dashboards                   |

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

### Development (Docker Compose)

```bash
# Start all infrastructure services
bun run db:start

# View logs
docker compose logs -f

# Stop services
bun run db:stop
```

### Services

| Service     | Port              | Description                 |
| ----------- | ----------------- | --------------------------- |
| TimescaleDB | 5444              | PostgreSQL with time-series |
| Redis       | 6379              | Caching layer               |
| EMQX        | 1883, 8083, 18083 | MQTT broker + dashboard     |

### Production Deployment

```bash
# Build application image
docker build -t kastor-iot .

# Run with environment file
docker run -p 3000:3000 --env-file .env.production kastor-iot
```

The Dockerfile includes:

- Multi-stage build for minimal image size
- Non-root user for security
- Health check endpoint
- Production-optimized Bun runtime

---

## Production Checklist

Before deploying to production, ensure:

- [ ] Set `NODE_ENV=production`
- [ ] Generate secure `BETTER_AUTH_SECRET` (32+ characters)
- [ ] Configure `TRUSTED_ORIGINS` with production domain
- [ ] Set strong database password in `DATABASE_URL`
- [ ] Configure MQTT authentication (`MQTT_USERNAME`, `MQTT_PASSWORD`)
- [ ] Set up EMQX user in dashboard (http://localhost:18083)
- [ ] Run TimescaleDB optimization script (`drizzle/0003_timescale_optimization.sql`)
- [ ] Configure Redis password if using Redis
- [ ] Set up SSL/TLS termination (nginx/cloudflare)
- [ ] Configure backup strategy for TimescaleDB
- [ ] Set up monitoring (Prometheus + Grafana recommended)

---

## Security Features

- **Authentication**: Better-Auth with Argon2 password hashing
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: 100 requests/minute per IP
- **MQTT Security**: Password-based authentication (anonymous disabled)
- **Audit Logging**: User action tracking for compliance
- **Input Validation**: Zod schemas on all API endpoints
- **CSRF Protection**: Built-in via Better-Auth
- **Secure Headers**: Recommended to add via reverse proxy

---

## Performance Optimizations

- **SSE Diff Updates**: Only changed data sent to clients (reduces bandwidth)
- **Redis Caching**: Dashboard data cached for 2-30 seconds
- **TimescaleDB Hypertables**: Optimized time-series queries
- **Continuous Aggregates**: Pre-computed hourly/daily statistics
- **Data Compression**: Old telemetry automatically compressed
- **ECharts Tree-Shaking**: Only used chart components bundled
- **Lazy Loading**: Route-based code splitting via SvelteKit

---

## Testing

```bash
# Unit tests
bun run test

# E2E tests (requires running server)
bun run test:e2e

# Interactive E2E test UI
bun run test:e2e:ui

# Coverage report
bun run test:coverage
```

---

## Monitoring

### Health Check

```bash
curl http://localhost:5173/api/health
```

Response:

```json
{
	"status": "ok",
	"timestamp": "2026-01-07T12:00:00.000Z",
	"version": "0.0.1",
	"checks": {
		"database": { "status": "ok", "latency": 5 }
	}
}
```

### Prometheus Metrics

Available at `/api/metrics` for scraping by Prometheus.

---

## Troubleshooting

### SSE not connecting

- Check that `MQTT_URL` is set in `.env`
- Verify EMQX is running: `docker compose logs emqx`
- Make a request to the app first to initialize MQTT client

### Database connection errors

- Verify TimescaleDB is running: `docker compose ps`
- Check `DATABASE_URL` format
- Ensure migrations are applied: `bun run db:push`

### Mock device not generating data

- Verify MQTT broker is accessible
- Check `bun scripts/mock-device.ts` output for errors
- Ensure engine records exist in database: `bun run db:seed`

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes with tests
4. Run linting and tests (`bun run lint && bun run test`)
5. Submit a pull request

---

## Author

**Прянишников Артём Алексеевич** (Lead Developer at ООО "Тотсофт")

- Email: [Pryanishnikovartem@gmail.com](mailto:Pryanishnikovartem@gmail.com)
- GitHub: [FrankFMY](https://github.com/FrankFMY)
- Telegram: [@frankfmy](https://t.me/frankfmy)

---

## License

Copyright (c) 2026 **ООО "Тотсофт"** (г. Бузулук). All rights reserved.

This project is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited. See the [LICENSE](LICENSE) file for full details.

---

<p align="center">
  Built with ❤️ for ООО "Тотсофт" using Svelte 5, SvelteKit, TailwindCSS & Bun
</p>
