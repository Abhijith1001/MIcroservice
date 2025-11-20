# Windows Docker Fix - Connection Refused Issue

## Problem
The error `ERR_CONNECTION_REFUSED` when accessing `http://localhost:7000/payment` was caused by using `network_mode: host` in docker-compose.yml, which **doesn't work on Windows Docker**.

## What Was Fixed

✅ **Removed `network_mode: host`** from all services
✅ **Added proper Docker bridge network** (`microservices-net`)  
✅ **Updated Kafka advertised listeners** to use container name (`kafka`) instead of `localhost`
✅ **Added environment variables** for service-to-service communication
✅ **Updated API gateway** to use env vars for payment service URL

## How to Restart Services

1. **Stop current containers:**
   ```bash
   docker compose down
   ```

2. **Rebuild and start with new configuration:**
   ```bash
   docker compose up --build -d
   ```

3. **Verify all services are running:**
   ```bash
   docker compose ps
   ```

4. **Check API Gateway is accessible:**
   ```bash
   curl http://localhost:7000
   ```
   
   You should get: `{"error":"Service not configured on gateway"}`

5. **Keep running your frontend:**
   ```bash
   cd Service/client
   npm run dev
   ```

6. **Test payment flow:**
   - Open http://localhost:3000
   - Add items to cart
   - Click "Pay securely"
   - Should redirect to Stripe!

## What Changed

### Docker Networking
**Before (Broken on Windows):**
- Services used `network_mode: host`
- Containers couldn't communicate properly
- Ports weren't exposed correctly

**After (Works on Windows):**
- Services use custom bridge network `microservices-net`
- Containers communicate using service names (e.g., `kafka:9092`, `payment-service:8000`)
- Ports properly exposed to host machine

### Service Communication

**Inside Docker Network:**
- API Gateway → `payment-service:8000` (container name)
- All services → `kafka:9092` (container name)

**From Your Browser/Frontend:**
- Frontend → `localhost:7000` (exposed port)
- API Gateway → `localhost:7000` (exposed port)

## Troubleshooting

### If services won't start:
```bash
# View logs for specific service
docker compose logs api-gateway
docker compose logs payment-service
docker compose logs kafka

# Restart specific service
docker compose restart api-gateway
```

### If port conflicts:
```bash
# Check what's using port 7000
netstat -ano | findstr :7000

# Kill the process if needed (replace PID)
taskkill /PID <PID> /F
```

### If Kafka connection issues:
```bash
# Check Kafka is accessible from payment service
docker compose exec payment-service sh -c "nc -zv kafka 9092"
```

## Quick Reference

| Service | Container Name | Exposed Port | Internal Port |
|---------|---------------|--------------|---------------|
| Kafka | kafka | 9092, 9094 | 9092 |
| Kafka UI | kafka-ui | 8080 | 8080 |
| Payment Service | payment-service | 8000 | 8000 |
| API Gateway | api-gateway | 7000 | 7000 |
| Email Service | email-service | - | - |
| Order Service | order-service | - | - |
| Analytic Service | analytic-service | - | - |

## Notes

- **Frontend runs outside Docker** via `npm run dev` on port 3000
- **All backend services run in Docker** and communicate via `microservices-net`
- **Environment variables** ensure services can find each other
- **This setup works on Windows, Mac, and Linux!**
