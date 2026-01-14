# ╔══════════════════════════════════════════════════════════════════════════╗
# ║                    KASTOR IoT - Makefile                                  ║
# ║                                                                            ║
# ║  Простые команды для управления проектом                                  ║
# ║  Использование: make [команда]                                            ║
# ╚══════════════════════════════════════════════════════════════════════════╝

.PHONY: help install dev build demo start stop restart logs status clean seed migrate

# Цвета
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m

# Переменные
COMPOSE_FILE := docker-compose.production.yaml
COMPOSE := docker compose -f $(COMPOSE_FILE)

##@ Справка
help: ## Показать эту справку
	@echo ""
	@echo "$(CYAN)╔═══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║              KASTOR IoT - Доступные команды                   ║$(NC)"
	@echo "$(CYAN)╚═══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf ""} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
	@echo ""

##@ Разработка (локально)
install: ## Установить зависимости
	bun install

dev: ## Запустить в режиме разработки
	bun run db:start
	@sleep 5
	bun run dev

build: ## Собрать для production
	bun run build

test: ## Запустить тесты
	bun run test

lint: ## Проверить код линтером
	bun run lint

##@ Docker (VPS/Production)
demo: ## 🚀 Запустить ДЕМО (один клик!)
	@chmod +x scripts/deploy.sh
	@./scripts/deploy.sh demo

production: ## Запустить в production режиме
	@chmod +x scripts/deploy.sh
	@./scripts/deploy.sh production

start: ## Запустить контейнеры
	$(COMPOSE) up -d

stop: ## Остановить контейнеры
	$(COMPOSE) down

restart: ## Перезапустить контейнеры
	$(COMPOSE) restart

logs: ## Показать логи (следить)
	$(COMPOSE) logs -f

logs-app: ## Показать логи приложения
	$(COMPOSE) logs -f app

status: ## Показать статус контейнеров
	$(COMPOSE) ps

##@ База данных
migrate: ## Применить миграции БД
	$(COMPOSE) exec app bunx drizzle-kit push

seed: ## Заполнить демо-данными
	$(COMPOSE) exec app bun run scripts/seed.ts

db-shell: ## Подключиться к PostgreSQL
	$(COMPOSE) exec db psql -U kastor -d kastor

##@ Утилиты
clean: ## Удалить все контейнеры и данные
	$(COMPOSE) down -v --remove-orphans
	docker system prune -f

update: ## Обновить и перезапустить
	git pull
	$(COMPOSE) up -d --build

shell-app: ## Открыть shell в контейнере приложения
	$(COMPOSE) exec app sh

shell-db: ## Открыть shell в контейнере БД
	$(COMPOSE) exec db sh

##@ Быстрые ссылки (info)
info: ## Показать ссылки на сервисы
	@echo ""
	@echo "$(CYAN)Доступные сервисы:$(NC)"
	@echo ""
	@echo "  🌐 Веб-приложение:   http://localhost:3000"
	@echo "  📊 EMQX Dashboard:   http://localhost:18083"
	@echo "  🔌 MQTT Broker:      mqtt://localhost:1883"
	@echo ""
	@echo "$(CYAN)Учётные данные:$(NC)"
	@echo ""
	@echo "  Веб: admin / admin"
	@echo "  EMQX: admin / kastor_admin_demo"
	@echo ""
