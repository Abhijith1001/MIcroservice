# AWS EC2 Deployment Guide - Microservice with Kafka (Single Instance)

This guide walks you through deploying your entire microservice architecture (Kafka + 7 services) on **one AWS EC2 instance** using Docker Compose.

---

## 🎯 What You'll Deploy

**Single EC2 Instance will run:**
- 🔷 Kafka + Zookeeper (message broker)
- 🔷 Next.js Frontend (port 3000)
- 🔷 API Gateway (port 7000)
- 🔷 Payment Service (port 8000)
- 🔷 Email Service (background consumer)
- 🔷 Order Service (background consumer)
- 🔷 Analytic Service (background consumer)

All services will communicate via **Docker network** and **Kafka topics**.

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] AWS Account with billing enabled
- [ ] AWS Key Pair created (for SSH access)
- [ ] Your Stripe Secret Key (`sk_test_...`)
- [ ] Gmail App Password (for email service)
- [ ] Git installed on your local machine
- [ ] This project ready to push to GitHub (or zip for upload)

---

## 🚀 PHASE 1: Prepare Your Code

### Step 1.1: Create Dockerfiles for All Services

You need a `Dockerfile` in each service directory. Here's what to create:

#### 📁 `Service/payment-service/Dockerfile`
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 8000

CMD ["node", "index.js"]
```

#### 📁 `Service/email-service/Dockerfile`
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 8001

CMD ["node", "index.js"]
```

#### 📁 `Service/order-service/Dockerfile`
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

CMD ["node", "index.js"]
```

#### 📁 `Service/analytic-service/Dockerfile`
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

CMD ["node", "index.js"]
```

#### 📁 `Service/api-gateway/Dockerfile`
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 7000

CMD ["node", "index.js"]
```

#### 📁 `Service/client/Dockerfile` (Next.js - Multi-stage)
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

> **💡 Why?** Each Dockerfile creates a lightweight container image for its service. Docker will build and run these in isolation but let them communicate via networking.

---

### Step 1.2: Create docker-compose.yml

Create this file at your project root (`MIcroservice with Kafka/docker-compose.yml`):

```yaml
version: "3.9"

services:
  zookeeper:
    image: bitnami/zookeeper:3.9
    environment:
      - ALLOW_ANONYMOUS_LOGIN=yes
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
      - ALLOW_PLAINTEXT_LISTENER=yes
    ports:
      - "9094:9092"

  payment-service:
    build:
      context: ./Service/payment-service
    environment:
      - CLIENT_URL=http://<YOUR_EC2_PUBLIC_DNS>:3000
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
      - KAFKA_BROKERS=kafka:9092
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
      - CLIENT_URL=http://<YOUR_EC2_PUBLIC_DNS>:3000
      - PAYMENT_SERVICE_BASE=http://payment-service:8000/payment-service
    depends_on:
      - payment-service
    ports:
      - "7000:7000"

  frontend:
    build:
      context: ./Service/client
    environment:
      - NEXT_PUBLIC_API_BASE=http://<YOUR_EC2_PUBLIC_DNS>:7000
    depends_on:
      - api-gateway
    ports:
      - "3000:3000"

networks:
  default:
    name: microservices-net
```

> **💡 Why?** Docker Compose orchestrates all services on one host. Services use **service names** (kafka:9092, payment-service:8000) instead of localhost. Replace `<YOUR_EC2_PUBLIC_DNS>` with your actual EC2 DNS later.

---

### Step 1.3: Create .env File

Create `.env` at project root:

```env
STRIPE_SECRET_KEY=sk_test_your_key_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
```

> **⚠️ Important:** Never commit this file to Git! Add it to `.gitignore`.

---

### Step 1.4: Update Your Service Code

Make sure your services read from environment variables instead of hardcoded `localhost`:

**Example - Payment Service:**
```javascript
const kafkaBrokers = process.env.KAFKA_BROKERS || 'localhost:9094';
const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
```

**Example - Email Service:**
```javascript
const brokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9094'];
```

> **💡 Why?** In Docker, `localhost` won't work because each service is in its own container. They need to use service names defined in docker-compose.yml.

---

## ☁️ PHASE 2: Provision AWS EC2 Instance

### Step 2.1: Launch EC2 Instance

1. Go to **AWS Console** → **EC2** → **Launch Instance**
2. **Name:** `microservice-kafka-server`
3. **AMI:** Ubuntu Server 22.04 LTS (Free tier eligible)
4. **Instance Type:** `t3.small` or `t3.medium` (minimum 2GB RAM for Kafka)
5. **Key Pair:** Select your existing key pair or create new
6. **Storage:** 20-30 GB gp3

> **💡 Why t3.small?** Kafka needs at least 2GB RAM. t2.micro (1GB) will crash.

---

### Step 2.2: Configure Security Group

Create/edit security group with these **Inbound Rules**:

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | Your IP | SSH access |
| Custom TCP | 3000 | 0.0.0.0/0 | Frontend |
| Custom TCP | 7000 | 0.0.0.0/0 | API Gateway |
| Custom TCP | 9094 | Your IP | Kafka (optional, for debugging) |

> **⚠️ Security Note:** For production, use ALB/Nginx and only expose port 80/443.

---

### Step 2.3: Launch and Note Public DNS

After launch, go to **Instances** → Select your instance → Copy **Public IPv4 DNS**

Example: `ec2-3-123-45-67.us-east-1.compute.amazonaws.com`

**Now update your `docker-compose.yml`** and replace `<YOUR_EC2_PUBLIC_DNS>` with this value!

---

## 🐳 PHASE 3: Setup EC2 Instance

### Step 3.1: SSH Into EC2

```bash
ssh -i /path/to/your-key.pem ubuntu@ec2-3-123-45-67.us-east-1.compute.amazonaws.com
```

---

### Step 3.2: Install Docker

Run these commands on EC2:

```bash
# Update packages
sudo apt-get update -y

# Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group (so you don't need sudo)
sudo usermod -aG docker ubuntu
```

**Log out and back in** for group changes to take effect:
```bash
exit
# SSH back in
ssh -i /path/to/your-key.pem ubuntu@your-ec2-dns
```

Verify:
```bash
docker --version
docker compose version
```

> **💡 Why?** Docker runs containers. Docker Compose orchestrates multi-container applications.

---

## 📦 PHASE 4: Deploy Your Application

### Step 4.1: Upload Your Code to EC2

**Option A - Using Git (Recommended):**

On your local machine:
```bash
cd "MIcroservice with Kafka"
git add .
git commit -m "Add Docker setup"
git push origin main
```

On EC2:
```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

**Option B - Using SCP:**

On your local machine:
```bash
cd "MIcroservice with Kafka"
tar -czf app.tar.gz .
scp -i /path/to/key.pem app.tar.gz ubuntu@your-ec2-dns:~
```

On EC2:
```bash
mkdir app
cd app
tar -xzf ../app.tar.gz
```

---

### Step 4.2: Setup Environment Variables

On EC2, create `.env` file:
```bash
nano .env
```

Paste your secrets:
```env
STRIPE_SECRET_KEY=sk_test_...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

Save with `Ctrl+O`, `Enter`, `Ctrl+X`

---

### Step 4.3: Build and Launch All Services

```bash
# Build all images and start containers
docker compose up -d --build
```

This will:
1. ⏳ Build Docker images for all 5 Node services (~5-10 minutes)
2. 🚀 Pull Kafka and Zookeeper images
3. 🎯 Start all 9 containers
4. 🔗 Create network for inter-service communication

> **💡 What's happening?** Docker Compose orchestrates:
> - Zookeeper starts first
> - Kafka waits for Zookeeper
> - Services wait for Kafka
> - They all connect via `microservices-net` network

---

### Step 4.4: Verify Deployment

Check running containers:
```bash
docker compose ps
```

Expected output:
```
NAME                    SERVICE            STATUS
app-zookeeper-1         zookeeper          running
app-kafka-1             kafka              running
app-payment-service-1   payment-service    running
app-email-service-1     email-service      running
app-order-service-1     order-service      running
app-analytic-service-1  analytic-service   running
app-api-gateway-1       api-gateway        running
app-frontend-1          frontend           running
```

---

### Step 4.5: Check Logs

View logs for any service:
```bash
# Payment service
docker compose logs -f payment-service

# Email service
docker compose logs -f email-service

# Kafka
docker compose logs kafka

# All services
docker compose logs
```

> **💡 Tip:** Look for "Connected to Kafka" or "Listening on port..." messages.

---

## 🧪 PHASE 5: Test Your Application

### Step 5.1: Access Frontend

Open browser:
```
http://ec2-3-123-45-67.us-east-1.compute.amazonaws.com:3000
```

You should see your Flipkart-style cart!

---

### Step 5.2: Test Payment Flow

1. Add items to cart
2. Click "Pay securely"
3. You'll redirect to Stripe checkout
4. Use test card: `4242 4242 4242 4242`, any future date, any CVC
5. Complete payment
6. Redirects back to success page

---

### Step 5.3: Verify Kafka Events

Check if Kafka messages are flowing:

```bash
# Check payment service logs
docker compose logs payment-service | grep "payment-successful"

# Check email service logs
docker compose logs email-service | grep "Sending email"

# Check order service logs
docker compose logs order-service | grep "order-successful"
```

---

### Step 5.4: Verify Email Delivery

Check your Gmail inbox - you should receive a confirmation email!

---

## 🔍 How It All Works Together

### Architecture Flow

```
┌─────────────┐
│   Browser   │
│ (Port 3000) │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────────┐
│    Frontend     │
│   (Next.js)     │
└──────┬──────────┘
       │ POST /payment
       ▼
┌─────────────────┐
│  API Gateway    │
│   (Port 7000)   │
└──────┬──────────┘
       │ Proxy to payment-service:8000
       ▼
┌──────────────────┐      ┌─────────────┐
│ Payment Service  │◄────►│   Stripe    │
│   (Port 8000)    │      │     API     │
└────────┬─────────┘      └─────────────┘
         │
         │ Publish "payment-successful"
         ▼
    ┌─────────┐
    │  Kafka  │
    │(Port    │
    │ 9092)   │
    └────┬────┘
         │
         ├──────────────┬──────────────┬───────────────┐
         │              │              │               │
         ▼              ▼              ▼               ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │  Order   │  │  Email   │  │ Analytic │  │  Future  │
   │ Service  │  │ Service  │  │ Service  │  │ Services │
   └──────────┘  └──────────┘  └──────────┘  └──────────┘
         │
         │ Publish "order-successful"
         ▼
    ┌─────────┐
    │  Kafka  │
    └─────────┘
```

### Network Communication

**Inside Docker Compose Network:**
- Services use DNS names: `kafka:9092`, `payment-service:8000`
- Containers can talk to each other directly
- Isolated from host except exposed ports

**Exposed to Internet:**
- Port 3000 → Frontend (users access this)
- Port 7000 → Gateway (frontend calls this)
- Port 8000 → Payment Service (gateway calls this)

**Kafka Topics:**
1. `payment-successful` → Payment service publishes after Stripe confirms
2. `order-successful` → Order service publishes after creating order
3. `email-successful` → Email service can publish confirmation

---

## 🛠️ Useful Commands

### Managing Services

```bash
# Stop all services
docker compose down

# Restart specific service
docker compose restart payment-service

# Rebuild after code changes
docker compose up -d --build

# View resource usage
docker stats

# Remove all containers and volumes
docker compose down -v
```

### Debugging

```bash
# Enter container shell
docker compose exec payment-service sh

# View environment variables
docker compose exec payment-service env

# Check Kafka topics (if you exposed Kafka UI)
# Access http://your-ec2-dns:8080 if you add Kafka UI to compose
```

---

## 🔒 Production Hardening (Next Steps)

This setup works for **development/demo**. For production:

1. **Add Nginx Reverse Proxy**
   - Only expose ports 80/443
   - Route traffic internally

2. **HTTPS with Let's Encrypt**
   ```bash
   sudo apt-get install certbot
   sudo certbot --nginx -d yourdomain.com
   ```

3. **Managed Services**
   - Use **Amazon MSK** for Kafka
   - Use **ECS Fargate** for services
   - Use **RDS** if you add database

4. **Secrets Management**
   - Use **AWS Secrets Manager**
   - Use **SSM Parameter Store**

5. **Monitoring**
   - Add **CloudWatch** logs
   - Add **Prometheus + Grafana**
   - Monitor Kafka consumer lag

6. **Scaling**
   - Add **Application Load Balancer**
   - Auto-scale services with ECS
   - Multi-broker Kafka cluster

---

## ❓ Troubleshooting

### Container Won't Start

```bash
docker compose logs <service-name>
```

Common issues:
- Kafka not ready → Services crash → `depends_on` should fix, but add retry logic
- Out of memory → Upgrade to t3.medium
- Port conflicts → Check if ports already in use

### Can't Connect to Frontend

1. Check security group allows port 3000
2. Check container is running: `docker compose ps`
3. Check logs: `docker compose logs frontend`

### Stripe Redirect Fails

Update `CLIENT_URL` in docker-compose.yml to match your actual EC2 DNS.

### Email Not Sending

1. Verify Gmail app password (not regular password)
2. Check email-service logs
3. Ensure "Less secure app access" enabled OR use App Password

---

## 📊 Cost Estimate

**AWS Costs (Monthly):**
- EC2 t3.small (2 vCPU, 2GB RAM): ~$15-20/month
- Storage (30GB): ~$3/month
- Data transfer: ~$1-5/month (light usage)

**Total: ~$20-30/month**

> **💡 Tip:** Use **AWS Free Tier** if eligible (12 months free for new accounts).

---

## ✅ Final Checklist

- [ ] All Dockerfiles created
- [ ] `docker-compose.yml` configured with EC2 DNS
- [ ] `.env` file with secrets
- [ ] EC2 instance launched (t3.small minimum)
- [ ] Security group ports open (22, 3000, 7000)
- [ ] Docker installed on EC2
- [ ] Code uploaded to EC2
- [ ] `docker compose up -d --build` successful
- [ ] All containers running (`docker compose ps`)
- [ ] Frontend accessible at port 3000
- [ ] Payment flow works end-to-end
- [ ] Email received after payment
- [ ] Kafka messages visible in logs

---

## 🎉 Success!

Your microservice architecture is now running on AWS! You have:
- ✅ Event-driven architecture with Kafka
- ✅ Payment processing with Stripe
- ✅ Email notifications
- ✅ Order management
- ✅ Analytics tracking
- ✅ All services containerized and orchestrated

**Access your app:** `http://your-ec2-dns:3000`

For questions or issues, check the logs with `docker compose logs -f <service-name>`.
