# KASTOR IoT

**Minimum Viable Product (MVP) dashboard for an Industrial IoT application.**

This project visualizes financial losses and equipment status for a gas power plant. It simulates engine data (Jenbacher J420/J624) via MQTT and visualizes it using SvelteKit, TailwindCSS, and ECharts.

## 🚀 Features

-   **Real-time Dashboard**: Live monitoring of engine power, efficiency, and financial losses.
-   **Engine Details**: Interactive charts (ECharts) showing correlation between Exhaust Temp and Active Power.
-   **Maintenance Forecast**: Predictive maintenance schedule based on engine running hours.
-   **Simulation**: Built-in Bun script to simulate MQTT telemetry for 6 engines, including "overheat" scenarios.
-   **Tech Stack**: Bun, SvelteKit, TimescaleDB, Drizzle ORM, EMQX (MQTT), Docker.

## 🛠️ Setup & Run

### Prerequisites
-   [Bun](https://bun.sh/) (v1.1+)
-   [Docker](https://www.docker.com/) & Docker Compose

### 1. Infrastructure
Start the database (TimescaleDB) and MQTT broker (EMQX):
```bash
bun run db:start
# or
docker compose up -d
```

### 2. Database Migration
Apply the schema to the database:
```bash
bun run db:migrate
```

### 3. Simulation
Start the device simulator in a separate terminal to generate live data:
```bash
bun run scripts/mock-device.ts
```

### 4. Frontend
Start the SvelteKit development server:
```bash
bun run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

## 👤 Author

**Прянишников Артём Алексеевич**

-   📧 Email: [Pryanishnikovartem@gmail.com](mailto:Pryanishnikovartem@gmail.com)
-   ✈️ Telegram: [@FrankFMY](https://t.me/FrankFMY)
-   🐙 GitHub: [FrankFMY](https://github.com/FrankFMY)

---
Built with ❤️ using SvelteKit & Bun.
