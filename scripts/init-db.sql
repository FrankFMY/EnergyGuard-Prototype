-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║                    EnergyGuard IoT - Database Initialization                   ║
-- ║                                                                            ║
-- ║  This script runs automatically when the database container starts        ║
-- ║  It creates all necessary tables, types, and demo data                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- ENUM TYPES
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE status AS ENUM ('ok', 'warning', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE event_level AS ENUM ('info', 'warning', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE service_type AS ENUM ('oil_change', 'filter_replacement', 'spark_plug', 'major_overhaul', 'inspection');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'operator', 'technician', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE work_order_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE work_order_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- BETTER-AUTH TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    image TEXT,
    role user_role DEFAULT 'viewer' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    access_token_expires_at TIMESTAMPTZ,
    refresh_token_expires_at TIMESTAMPTZ,
    scope TEXT,
    password TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ═══════════════════════════════════════════════════════════════
-- AUDIT LOG
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- ═══════════════════════════════════════════════════════════════
-- CORE TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS engines (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    status status DEFAULT 'ok' NOT NULL,
    total_hours INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS telemetry (
    time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    engine_id TEXT NOT NULL REFERENCES engines(id),
    power_kw DOUBLE PRECISION NOT NULL,
    temp_exhaust DOUBLE PRECISION NOT NULL,
    gas_consumption DOUBLE PRECISION NOT NULL,
    vibration DOUBLE PRECISION DEFAULT 0 NOT NULL,
    gas_pressure DOUBLE PRECISION DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_engine_time ON telemetry(engine_id, time);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    engine_id TEXT REFERENCES engines(id)
);

CREATE TABLE IF NOT EXISTS downtimes (
    id TEXT PRIMARY KEY,
    engine_id TEXT NOT NULL REFERENCES engines(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    reason TEXT,
    loss_rub DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS spare_parts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    part_number TEXT,
    quantity INTEGER DEFAULT 0 NOT NULL,
    min_quantity INTEGER DEFAULT 5 NOT NULL,
    unit_cost DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id TEXT PRIMARY KEY,
    engine_id TEXT NOT NULL REFERENCES engines(id),
    service_type service_type NOT NULL,
    due_date TIMESTAMPTZ,
    due_hours INTEGER NOT NULL,
    estimated_cost DOUBLE PRECISION DEFAULT 0 NOT NULL,
    parts_required JSONB DEFAULT '[]',
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cost_records (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    category TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    engine_id TEXT REFERENCES engines(id),
    description TEXT
);

-- ═══════════════════════════════════════════════════════════════
-- ALERTS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    engine_id TEXT REFERENCES engines(id),
    severity alert_severity NOT NULL,
    status alert_status DEFAULT 'active' NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metric TEXT,
    threshold DOUBLE PRECISION,
    actual_value DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    acknowledged_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_alerts_engine_id ON alerts(engine_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);

CREATE TABLE IF NOT EXISTS alert_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    engine_id TEXT REFERENCES engines(id),
    metric TEXT NOT NULL,
    operator TEXT NOT NULL,
    threshold DOUBLE PRECISION NOT NULL,
    duration_seconds INTEGER DEFAULT 60 NOT NULL,
    severity alert_severity NOT NULL,
    enabled BOOLEAN DEFAULT TRUE NOT NULL,
    notify_email BOOLEAN DEFAULT TRUE NOT NULL,
    notify_sms BOOLEAN DEFAULT FALSE NOT NULL,
    notify_push BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ═══════════════════════════════════════════════════════════════
-- WORK ORDERS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS work_orders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    engine_id TEXT REFERENCES engines(id),
    status work_order_status DEFAULT 'open' NOT NULL,
    priority work_order_priority DEFAULT 'medium' NOT NULL,
    assigned_to TEXT REFERENCES users(id),
    created_by TEXT REFERENCES users(id),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_hours DOUBLE PRECISION,
    actual_hours DOUBLE PRECISION,
    parts_required JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_engine_id ON work_orders(engine_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to);

-- ═══════════════════════════════════════════════════════════════
-- DEMO DATA
-- ═══════════════════════════════════════════════════════════════

-- Engines
INSERT INTO engines (id, model, status, total_hours) VALUES
    ('gpu-1', 'Wärtsilä 20V34SG', 'ok', 8500),
    ('gpu-2', 'MAN 18V48/60', 'warning', 12300),
    ('gpu-3', 'Caterpillar CG260-16', 'ok', 6200),
    ('gpu-4', 'Jenbacher J920', 'ok', 9100),
    ('gpu-5', 'Rolls-Royce B35:40', 'ok', 4800),
    ('gpu-6', 'GE Jenbacher J624', 'ok', 15200)
ON CONFLICT (id) DO UPDATE SET
    model = EXCLUDED.model,
    total_hours = EXCLUDED.total_hours;

-- Admin user (for demo login)
INSERT INTO users (id, name, email, email_verified, role) VALUES
    ('admin-user-1', 'Администратор', 'admin@energyguard.io', true, 'admin'),
    ('operator-user-1', 'Оператор Иванов', 'operator@energyguard.io', true, 'operator'),
    ('tech-user-1', 'Техник Петров', 'tech@energyguard.io', true, 'technician')
ON CONFLICT (id) DO NOTHING;

-- Spare parts
INSERT INTO spare_parts (id, name, part_number, quantity, min_quantity, unit_cost) VALUES
    ('part-1', 'Масляный фильтр', 'OF-2034', 24, 10, 2500),
    ('part-2', 'Воздушный фильтр', 'AF-1856', 18, 8, 3200),
    ('part-3', 'Свеча зажигания', 'SP-4420', 48, 24, 850),
    ('part-4', 'Прокладка ГБЦ', 'GH-7712', 6, 4, 15000),
    ('part-5', 'Термостат', 'TH-3340', 8, 4, 4500)
ON CONFLICT (id) DO NOTHING;

-- Default alert rules
INSERT INTO alert_rules (id, name, metric, operator, threshold, severity, enabled) VALUES
    ('rule-1', 'Высокая температура выхлопа', 'temp_exhaust', 'gt', 520, 'warning', true),
    ('rule-2', 'Критическая температура выхлопа', 'temp_exhaust', 'gt', 550, 'critical', true),
    ('rule-3', 'Высокая вибрация', 'vibration', 'gt', 8, 'warning', true),
    ('rule-4', 'Критическая вибрация', 'vibration', 'gt', 12, 'critical', true),
    ('rule-5', 'Низкое давление газа', 'gas_pressure', 'lt', 2.5, 'warning', true)
ON CONFLICT (id) DO NOTHING;

-- Done!
SELECT 'EnergyGuard IoT Database initialized successfully!' AS status;
