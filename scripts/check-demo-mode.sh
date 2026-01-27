#!/bin/bash
# Скрипт для проверки статуса DEMO режима

echo "🔍 Проверка DEMO режима EnergyGuard IoT"
echo "===================================="
echo ""

# Проверка переменных окружения в контейнере
echo "📦 Переменные окружения в контейнере:"
docker exec energyguard-app printenv | grep -E "DEMO_MODE|NODE_ENV" || echo "Контейнер не запущен или переменные не найдены"
echo ""

# Проверка через API health endpoint
echo "🌐 Проверка через API:"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ API доступен"
    echo "Response: $HEALTH_RESPONSE" | head -c 200
    echo ""
else
    echo "❌ API недоступен (возможно контейнер не запущен)"
fi
echo ""

# Проверка логики в коде
echo "💡 Логика определения DEMO режима:"
echo "   - DEMO_MODE === 'true' ИЛИ NODE_ENV === 'development'"
echo ""
echo "📋 Текущая конфигурация docker-compose:"
grep -A 2 "DEMO_MODE" docker-compose.production.yaml | head -3
echo ""

# Итоговый статус
echo "===================================="
echo "✅ DEMO режим ВКЛЮЧЕН если:"
echo "   1. DEMO_MODE=true (по умолчанию в docker-compose)"
echo "   2. ИЛИ NODE_ENV=development"
echo ""
echo "📝 Для явного включения/выключения:"
echo "   export DEMO_MODE=true   # Включить"
echo "   export DEMO_MODE=false  # Выключить"
echo "   docker compose -f docker-compose.production.yaml --profile demo up -d"
