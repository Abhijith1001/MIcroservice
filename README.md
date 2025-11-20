# Deploying This Microservice + Kafka App on 1 EC2 with Docker Compose

This guide explains how to run the entire system (Kafka + microservices + API gateway + Next.js frontend) on **one AWS EC2 instance** using **Docker Compose**.

> This is a practical "all-in-one" deployment for demos and learning. Later, you can split Kafka and services onto separate instances or managed services (e.g. MSK, ECS).

---

## 1. Architecture Overview

Current services in this repo (under `Service/`):

- **client** – Next.js frontend (`/Service/client`)
- **api-gateway** – Express gateway on port 7000 (`/Service/api-gateway`)
- **payment-service** – Express + Stripe + Kafka producer (`/Service/payment-service`)
- **email-service** – Kafka consumer + Nodemailer (`/Service/email-service`)
- **order-service** – Kafka consumer/producer (`/Service/order-service`)
- **analytic-service** – Kafka consumer (`/Service/analytic-service`)
- **kafka** – Kafka broker (and possibly Zookeeper if not using KRaft) (`/Service/kafka`)

Locally you run everything on `localhost`:

- Frontend: `http://localhost:3000`
- API Gateway: `http://localhost:7000`
- Payment service: `http://localhost:8000/payment-service`
- Kafka broker: `localhost:9094`

On EC2 with Docker Compose you will:

- Run **all containers on one host network**.
- Use **Docker service names** instead of `localhost` _inside_ the containers.
- Expose only necessary ports from EC2 (e.g. frontend + gateway).

---

## 2. Prerequisites

### Local machine

- Git installed
- Docker + Docker Compose installed (or Docker Desktop)

### AWS

1. **AWS account**.
2. **EC2 key pair** created (for SSH).
3. Basic familiarity with:
   - Creating an EC2 instance
   - Opening security group ports
   - SSH into EC2

---

## 3. Prepare Code for Docker

For each Node service you will create a `Dockerfile`. Below is an _example_ for one service; you can reuse the pattern.

### 3.1 Example Dockerfile – payment-service

Create `Service/payment-service/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 8000

CMD ["node", "index.js"]
```

### 3.2 Example Dockerfile – email-service

`Service/email-service/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 8001

CMD ["node", "index.js"]
```

> Adjust `EXPOSE` only for documentation; actual container ports can be mapped by Compose.

### 3.3 Example Dockerfile – api-gateway

`Service/api-gateway/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 7000

CMD ["node", "index.js"]
```

### 3.4 Example Dockerfile – client (Next.js)

`Service/client/Dockerfile` (multi-stage, simple):

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package*.json ./
COPY next.config.mjs ./

RUN npm install --only=production

EXPOSE 3000

CMD ["npm", "start"]
```

### 3.5 Kafka

You can use community images (e.g. Bitnami) instead of building your own. Example will be shown in `docker-compose.yml`.

---

## 4. Create docker-compose.yml

Create `docker-compose.yml` in the **project root** (`MIcroservice with Kafka/`):

```yaml
version: "3.9"

services:
  zookeeper:
    image: bitnami/zookeeper:3.9
    environment:
      - ZOO_ENABLE_AUTH=no
      - ZOO_CLIENT_PORT=2181
    ports:
      - "2181:2181"

  kafka:
    image: bitnami/kafka:3.7
    depends_on:
      - zookeeper
    environment:
      - KAFKA_ENABLE_KRAFT=no
      - KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper:2181
      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092
      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092
      - KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE=true
    ports:
      - "9094:9092" # expose to host if you need it

  payment-service:
    build:
      context: ./Service/payment-service
    environment:
      - CLIENT_URL=http://frontend:3000
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - kafka
    ports:
      - "8000:8000"

  email-service:
    build:
      context: ./Service/email-service
    environment:
      - EMAIL_HOST=${EMAIL_HOST:-smtp.gmail.com}
      - EMAIL_PORT=${EMAIL_PORT:-587}
      - EMAIL_SECURE=${EMAIL_SECURE:-false}
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASSWORD=${EMAIL_PASSWORD}
    depends_on:
      - kafka

  order-service:
    build:
      context: ./Service/order-service
    environment:
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - kafka

  analytic-service:
    build:
      context: ./Service/analytic-service
    environment:
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - kafka

  api-gateway:
    build:
      context: ./Service/api-gateway
    environment:
      - CLIENT_URL=http://frontend:3000
      - PAYMENT_SERVICE_BASE=http://payment-service:8000/payment-service
    depends_on:
      - payment-service
    ports:
      - "7000:7000"

  frontend:
    build:
      context: ./Service/client
    environment:
      - NEXT_PUBLIC_API_BASE=http://your-ec2-public-dns:7000
    depends_on:
      - api-gateway
    ports:
      - "3000:3000"

networks:
  default:
    name: microservices-net
```

> **Important**: Inside containers, use `kafka:9092`, `payment-service:8000`, `api-gateway:7000`, etc., not `localhost`.

You will need to adjust your Node code to read `KAFKA_BROKERS` / `PAYMENT_SERVICE_BASE` env vars instead of hardcoded `localhost` when running in Docker.

---

## 5. Create .env for Docker

In the project root, create `.env` (used by docker-compose):

```env
STRIPE_SECRET_KEY=sk_test_...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=soniwdew@gmail.com
EMAIL_PASSWORD=your_app_password_here
```

Do **not** commit real secrets to Git.

---

## 6. Provision 1 EC2 instance

1. Go to **AWS Console → EC2 → Launch instance**.
2. Choose an image: **Ubuntu 22.04 LTS**.
3. Choose an instance type: `t3.small` or `t3.medium` (for this stack).
4. Configure storage: 20–30 GB is usually enough.
5. Configure security group:
   - Inbound rules:
     - SSH: port **22** from your IP
     - HTTP: port **80** (optional)
     - Custom TCP: port **3000** (frontend)
     - Custom TCP: port **7000** (gateway) – or route via Nginx/80
6. Launch with your key pair.

Take note of the **Public IPv4 address** or **Public DNS** of the instance.

---

## 7. Install Docker & Docker Compose on EC2

SSH into the instance:

```bash
ssh -i /path/to/key.pem ubuntu@your-ec2-public-dns
```

Install Docker:

```bash
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

sudo usermod -aG docker ubuntu
```

Log out and back in so group changes apply.

Docker Compose plugin (on newer Docker this is included). If not:

```bash
sudo apt-get install -y docker-compose-plugin
```

Check:

```bash
docker --version
docker compose version
```

---

## 8. Deploy the app on EC2

On your **local** machine:

```bash
cd "MIcroservice with Kafka"
# Option A: push to GitHub and clone on EC2
# Option B: zip & scp the project
```

On **EC2**:

```bash
# If using git
git clone https://github.com/your-user/your-repo.git
cd your-repo

# Ensure .env exists at project root
ls .env

# Build & run all services
sudo docker compose up -d --build

# See containers
sudo docker compose ps

# See logs for a specific service
sudo docker compose logs -f email-service
sudo docker compose logs -f payment-service
```

Once up:

- Frontend: `http://your-ec2-public-dns:3000`
- Gateway: `http://your-ec2-public-dns:7000`

Stripe will redirect back to `CLIENT_URL` (which you should set to `http://your-ec2-public-dns:3000`).

---

## 9. Hardening / Next Steps

- Put **Nginx** / **ALB** in front and expose only port 80/443.
- Use **Lets Encrypt** or AWS ACM for HTTPS.
- Move secrets to **SSM Parameter Store** or **Secrets Manager**.
- Consider **Amazon MSK** for Kafka and **ECS Fargate** for services when you outgrow single EC2.

---

## 10. Quick Checklist

- [ ] Dockerfiles created for all Node services
- [ ] `docker-compose.yml` at project root
- [ ] `.env` with Stripe + SMTP secrets
- [ ] EC2 instance running (Ubuntu, Docker installed)
- [ ] Repo copied / cloned onto EC2
- [ ] `docker compose up -d --build` succeeds
- [ ] You can open frontend at `http://<EC2-DNS>:3000`
- [ ] Payment flow works, Kafka messages flow, and email arrives
