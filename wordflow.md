# Microservice + Kafka Workflow

## 1. High-Level Flow
1. **Frontend Cart & Checkout**
   - Users view Flipkart-style cart (`src/app/page.jsx`).
   - Clicking **Pay securely** in `Pay.jsx` POSTs the cart to the API Gateway (`/payment`).
2. **API Gateway (`Service/api-gateway/index.js`)**
   - Proxies `/payment` and `/payment/verify` to the payment service running on port 8000.
3. **Payment Service (`Service/payment-service/index.js`)**
   - Creates Stripe Checkout sessions.
   - After Stripe redirects back, `/verify` confirms the session and publishes a `payment-successful` Kafka message containing `{ userId, cart, amount }`.
4. **Kafka Layer**
   - Provisioned by `Service/kafka/docker-compose.yml` (Kafka broker + Kafka UI).
   - Topics created by `Service/kafka/admin.js`: `payment-successful`, `order-successful`, `email-successful`.
   - Screenshots confirm the broker, topics, partitions, and consumer groups are healthy.
5. **Downstream Consumers**
   - `order-service`: consumes `payment-successful`, creates orders, emits `order-successful`.
   - `email-service`: consumes `payment-successful` (and optionally `order-successful`), sends Nodemailer emails via Gmail.
   - `analytic-service`: consumes all three topics to log analytics.
6. **Success Page (`src/app/success/page.jsx`)**
   - Verifies Stripe session via the gateway, shows status to the user.

---

## 2. Sequence of Events
1. **Checkout request** → Frontend → Gateway → Payment Service.
2. **Stripe session** returned → Frontend redirects user to Stripe.
3. **Stripe redirect** → `/success?session_id=...` on the frontend.
4. **Verification call** → Gateway `/payment/verify` → Payment Service → Stripe API.
5. **Kafka publish** → `payment-successful` topic.
6. **Consumers react**:
   - Order service → `order-successful` topic.
   - Email service → sends Gmail confirmation.
   - Analytic service → logs events.

---

## 3. Components & Purpose
| File | Purpose |
|------|---------|
| `Service/client/src/components/Pay.jsx` | UX for checkout button, mutation call, Stripe redirect. |
| `Service/client/src/app/success/page.jsx` | Post-payment verification and messaging. |
| `Service/api-gateway/index.js` | Single HTTP entry point forwarding to payment service. |
| `Service/payment-service/index.js` | Stripe checkout + verification + Kafka producer. |
| `Service/order-service/index.js` | Kafka consumer, emits downstream order events. |
| `Service/email-service/index.js` | Kafka consumer sending confirmation emails. |
| `Service/analytic-service/index.js` | Kafka consumer logging analytics. |
| `Service/kafka/admin.js` | Topic creation script. |
| `Service/kafka/docker-compose.yml` | Kafka broker + UI containers. |

---

## 4. Fault Tolerance & Edge Cases
- **Kafka resilience**: topics have 3 partitions but replication factor = 1 (dev). For production, increase replication factor and brokers.
- **Consumer lag**: if a service goes down, messages accumulate (screenshot shows lag 5 for `order-successful`). Restarting consumers processes backlog automatically.
- **Stripe metadata limit**: payment service stores a compact cart so metadata stays <500 chars.
- **Gateway 404 handling**: routes unrecognized services with a clear error; subpaths now supported (`/payment/verify`).
- **SMTP failures**: email service logs message ID; consider retry/DLQ for production.

---

## 5. Future Enhancements
1. **Infrastructure**: multi-broker Kafka, MSK, Docker Compose deployment (see README), monitoring.
2. **Services**: add inventory, shipping, or notification microservices.
3. **Reliability**: add retry policies, DLQ topics, schema registry.
4. **Observability**: metrics on consumer lag, Stripe events, email success.
5. **Security**: move secrets to env/SSM, add auth for API Gateway.

---

## 6. Screenshots Recap
- **Containers view**: shows Kafka + UI containers up.
- **Broker summary**: 1 broker, 59 partitions, no URP.
- **Topics view**: lists `_consumer_offsets`, `payment-successful`, `order-successful`, `email-successful` with counts.
- **Topic detail**: partition stats for `email-successful`.
- **Consumers view**: `analytic-service`, `email-service`, `order-service` groups stable; lag indicates pending messages.

This file summarizes the entire workflow so new contributors can understand the event-driven architecture end to end.
