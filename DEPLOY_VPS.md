# Deploy на VPS (TimeWeb, Beget, DigitalOcean и др.)

Эта инструкция поднимает весь стек в Docker Compose: приложение + TimescaleDB + EMQX (MQTT).

## Что нужно заранее

- VPS (Ubuntu 20.04+/Debian 11+), доступ по SSH
- Минимум 2GB RAM, 20GB диска
- Открытые порты: 22 (SSH), 3000 (приложение), 18083 (EMQX Dashboard)

---

## Быстрый старт (ДЕМО за 2 минуты)

```bash
# 1. Подключаемся к серверу
ssh root@IP_СЕРВЕРА

# 2. Устанавливаем Docker (если нет)
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# 3. Клонируем и запускаем
git clone https://github.com/FrankFMY/energyguard-iot.git
cd energyguard-iot
chmod +x scripts/deploy.sh
./scripts/deploy.sh demo
```

Готово! Откройте http://IP_СЕРВЕРА:3000

---

## Доступные сервисы

| Сервис         | URL             | Логин       | Пароль            |
| -------------- | --------------- | ----------- | ----------------- |
| Приложение     | http://IP:3000  | Регистрация | -                 |
| EMQX Dashboard | http://IP:18083 | admin       | energyguard_admin_demo |

---

## Полезные команды

```bash
# Статус
docker ps

# Логи
docker logs -f energyguard-app

# Перезапуск
docker restart energyguard-app

# Остановить
docker compose -f docker-compose.production.yaml down

# Обновить
git pull && docker compose -f docker-compose.production.yaml --profile demo up -d --build
```

---

## Настройка домена

На DNS-провайдере добавьте A-запись:

```
Тип: A
Имя: energyguard (или @)
Значение: IP_ВАШЕГО_VPS
TTL: 300
```

Затем обновите TRUSTED_ORIGINS в .env:

```bash
nano .env
TRUSTED_ORIGINS=https://energyguard.totsoft.net
docker restart energyguard-app
```

---

## Firewall (рекомендуется)

```bash
apt install -y ufw
ufw allow OpenSSH
ufw allow 3000/tcp
ufw --force enable
```
