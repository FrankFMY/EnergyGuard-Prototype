# Deploy на Beget VPS (самый простой путь, copy‑paste)

Эта инструкция поднимает весь стек **в Docker Compose**: приложение + TimescaleDB(Postgres) + Redis + EMQX(MQTT).

## Что нужно заранее
- VPS на Beget (Ubuntu/Debian), доступ по SSH.
- Открытый порт **3000** (или 80/443 если будете ставить Nginx/домен).
- Домен/HTTPS — **не обязателен** для первого запуска.

---

## 1) Подключиться к серверу

```bash
ssh root@<IP_СЕРВЕРА>
```

---

## 2) Установить Docker и Git

```bash
apt update
apt install -y git curl

curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker --version
docker compose version
```

---

## 3) Скачать проект на сервер

Рекомендуемый путь — `/opt/kastor-iot`:

```bash
cd /opt
git clone <URL_РЕПОЗИТОРИЯ> kastor-iot
cd kastor-iot
```

---

## 4) Создать `.env` (обязательно для production)

```bash
cp .env.example .env
nano .env
```

Минимум, что нужно поменять (иначе **нельзя** в прод):
- **DB_PASSWORD** — пароль базы
- **REDIS_PASSWORD** — пароль redis
- **MQTT_PASSWORD** — пароль пользователя для приложения (EMQX)
- **MQTT_ADMIN_PASSWORD** — пароль админки EMQX (порт 18083)
- **AUTH_SECRET** и/или **BETTER_AUTH_SECRET** — случайная строка 32+ символа
- **TRUSTED_ORIGINS** — реальный URL, по которому открываете сайт:
  - если пока без домена: `http://<IP_СЕРВЕРА>:3000`
  - если с доменом/https: `https://your-domain.com`

Быстро сгенерировать секрет (любой один, 32+):

```bash
openssl rand -base64 48
```

---

## 5) Запустить production

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh production
```

---

## 6) Проверка что всё живое

Статус контейнеров:

```bash
docker compose -f docker-compose.production.yaml ps
```

Healthcheck приложения:

```bash
curl -fsS http://localhost:3000/api/health | head
```

Логи приложения:

```bash
docker compose -f docker-compose.production.yaml logs -f app
```

Открыть в браузере:
- Приложение: `http://<IP_СЕРВЕРА>:3000`

---

## Остановка / перезапуск

```bash
# остановить (данные БД сохранятся в volume)
docker compose -f docker-compose.production.yaml down

# запустить снова
docker compose -f docker-compose.production.yaml up -d

# пересобрать и запустить
docker compose -f docker-compose.production.yaml up -d --build
```

---

## Минимальная безопасность (рекомендуется)

Если сервисы торчат наружу — поставьте firewall и оставьте только нужные порты.

Пример (если пока без домена, только 3000):

```bash
apt install -y ufw
ufw allow OpenSSH
ufw allow 3000/tcp
ufw --force enable
ufw status
```

> Если будете использовать Nginx+HTTPS, вместо 3000 откройте 80/443 и закройте 3000 наружу.

