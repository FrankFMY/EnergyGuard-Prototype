#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════╗
# ║                    KASTOR IoT - Deployment Script                         ║
# ║                                                                            ║
# ║  Скрипт для развертывания проекта на VPS                                 ║
# ║  Использование: ./scripts/deploy.sh [demo|production]                    ║
# ╚══════════════════════════════════════════════════════════════════════════╝

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Функции для логирования
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Баннер
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██╗  ██╗ █████╗ ███████╗████████╗ ██████╗ ██████╗          ║
║   ██║ ██╔╝██╔══██╗██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗         ║
║   █████╔╝ ███████║███████╗   ██║   ██║   ██║██████╔╝         ║
║   ██╔═██╗ ██╔══██║╚════██║   ██║   ██║   ██║██╔══██╗         ║
║   ██║  ██╗██║  ██║███████║   ██║   ╚██████╔╝██║  ██║         ║
║   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝         ║
║                                                               ║
║              Industrial IoT Platform                          ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Проверка Docker
check_docker() {
    log_info "Проверка Docker..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker не установлен!"
        echo ""
        echo "Установите Docker командой:"
        echo "  curl -fsSL https://get.docker.com | sh"
        echo "  sudo usermod -aG docker \$USER"
        echo "  newgrp docker"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon не запущен или нет прав доступа"
        echo "Попробуйте: sudo systemctl start docker"
        exit 1
    fi
    
    log_success "Docker OK"
}

# Проверка Docker Compose
check_docker_compose() {
    log_info "Проверка Docker Compose..."
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose не установлен!"
        exit 1
    fi
    log_success "Docker Compose OK"
}

# Определение режима
MODE="${1:-demo}"

if [[ "$MODE" != "demo" && "$MODE" != "production" ]]; then
    log_error "Неверный режим: $MODE"
    echo "Использование: ./scripts/deploy.sh [demo|production]"
    exit 1
fi

log_info "Режим развертывания: ${YELLOW}$MODE${NC}"
echo ""

# Проверки
check_docker
check_docker_compose

# Копирование .env файла
log_info "Настройка переменных окружения..."
if [[ "$MODE" == "demo" ]]; then
    if [[ ! -f ".env" ]]; then
        cp .env.demo .env
        log_success "Скопирован .env.demo -> .env"
    else
        log_warning ".env уже существует, пропускаем"
    fi
else
    if [[ ! -f ".env" ]]; then
        log_warning "Файл .env не найден!"
        echo ""
        echo "Для production создайте .env файл на основе .env.example:"
        echo "  cp .env.example .env"
        echo "  nano .env"
        echo ""
        echo "Или запустите в demo режиме:"
        echo "  ./scripts/deploy.sh demo"
        exit 1
    fi
fi

# Загрузка переменных
source .env

echo ""
log_info "Сборка и запуск контейнеров..."
echo ""

# Запуск в зависимости от режима
if [[ "$MODE" == "demo" ]]; then
    # Demo режим - с симулятором
    docker compose -f docker-compose.production.yaml --profile demo up -d --build
else
    # Production режим - без симулятора
    docker compose -f docker-compose.production.yaml up -d --build
fi

echo ""
log_info "Ожидание запуска сервисов..."
sleep 10

# Проверка здоровья сервисов
log_info "Проверка статуса сервисов..."
docker compose -f docker-compose.production.yaml ps

echo ""

# Инициализация базы данных
log_info "Инициализация базы данных..."

# Ждём пока БД полностью запустится
MAX_RETRIES=30
RETRY_COUNT=0
while ! docker compose -f docker-compose.production.yaml exec -T db pg_isready -U ${DB_USER:-kastor} -d ${DB_NAME:-kastor} &>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        log_error "База данных не запустилась за 30 секунд"
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo ""
log_success "База данных готова"

# Применение миграций (через app контейнер)
log_info "Применение миграций базы данных..."
docker compose -f docker-compose.production.yaml exec -T app sh -c "cd /app && bunx drizzle-kit push" 2>/dev/null || {
    log_warning "Миграции не применены автоматически. Это нормально при первом запуске."
    log_info "Миграции будут применены при первом обращении к приложению."
}

# Seed данных для demo
if [[ "$MODE" == "demo" ]]; then
    log_info "Заполнение демо-данными..."
    docker compose -f docker-compose.production.yaml exec -T app sh -c "cd /app && bun run scripts/seed.ts" 2>/dev/null || {
        log_warning "Seed не выполнен. Попробуйте вручную: docker compose -f docker-compose.production.yaml exec app bun run scripts/seed.ts"
    }
fi

echo ""
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                    🎉 РАЗВЕРТЫВАНИЕ ЗАВЕРШЕНО! 🎉              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

APP_PORT="${APP_PORT:-3000}"
SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")

echo -e "${CYAN}Доступные сервисы:${NC}"
echo ""
echo -e "  🌐 ${GREEN}Веб-приложение:${NC}     http://${SERVER_IP}:${APP_PORT}"
echo -e "  📊 ${GREEN}EMQX Dashboard:${NC}     http://${SERVER_IP}:18083"
echo -e "  🔌 ${GREEN}MQTT Broker:${NC}        mqtt://${SERVER_IP}:1883"
echo ""
echo -e "${CYAN}Учётные данные для входа:${NC}"
echo ""
echo -e "  ${YELLOW}Веб-приложение:${NC}"
echo -e "     Логин: ${GREEN}admin${NC}"
echo -e "     Пароль: ${GREEN}admin${NC}"
echo ""
echo -e "  ${YELLOW}EMQX Dashboard:${NC}"
echo -e "     Логин: ${GREEN}admin${NC}"
echo -e "     Пароль: ${GREEN}${MQTT_ADMIN_PASSWORD:-kastor_admin_demo}${NC}"
echo ""
echo -e "${CYAN}Полезные команды:${NC}"
echo ""
echo "  # Просмотр логов"
echo "  docker compose -f docker-compose.production.yaml logs -f"
echo ""
echo "  # Остановка"
echo "  docker compose -f docker-compose.production.yaml down"
echo ""
echo "  # Перезапуск"
echo "  docker compose -f docker-compose.production.yaml restart"
echo ""
echo "  # Просмотр статуса"
echo "  docker compose -f docker-compose.production.yaml ps"
echo ""
