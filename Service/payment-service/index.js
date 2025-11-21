import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { Kafka } from "kafkajs";

dotenv.config();

const app = express();
const CLIENT_URL = process.env.CLIENT_URL || "https://microservice-pi.vercel.app"; //,http://localhost:3000
const EMAIL_TO = "abhijiithb@gmail.com";

const key = "sk_test_51SOB4iGt8XhRuxWJEWkAvAjqjxLOl8fsxDAx7GJOm3sXMnjzugZynDIwgYnkCvqIkj3p4q8qE9LNTGdYtRiEPTrj00J8VdgupO"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || key, {
  apiVersion: "2022-11-15",
});

const kafka = new Kafka({
  clientId: "payment-service",
  brokers: ["kafka:9092"],
});

const producer = kafka.producer();

const connectToKafka = async () => {
  try {
    await producer.connect();
    console.log("Producer connected!");
  } catch (err) {
    console.log("Error connecting to Kafka", err);
  }
};

const formatLineItems = (cart = []) =>
  cart.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.name,
        description: item.description,
      },
      unit_amount: Math.round((item.price || 0) * 100),
    },
    quantity: item.quantity || 1,
  }));

const webhookRawBody = express.raw({ type: "application/json" });

app.use(
  cors({
    origin: CLIENT_URL,
  })
);

app.use(express.json());

app.post("/payment-service", async (req, res, next) => {
  try {
    const { cart = [] } = req.body;

    if (!Array.isArray(cart) || !cart.length) {
      return res.status(400).send({ error: "Cart must contain at least one item" });
    }

    const line_items = formatLineItems(cart);

    const compactCart = cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      success_url: `${CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/cancel`,
      metadata: {
        cart: JSON.stringify(compactCart),
        userId: "123",
        email: EMAIL_TO,
      },
    });

    return res.status(201).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
});

app.post("/payment-service/verify", express.json(), async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).send({ error: "sessionId is required" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return res.status(400).send({ error: "Payment not completed" });
    }

    const metadata = session.metadata || {};
    const parsedCart = metadata.cart ? JSON.parse(metadata.cart) : [];

    const userId = metadata.userId || "123";
    const amount = session.amount_total || 0;

    try {
      await producer.send({
        topic: "payment-successful",
        messages: [
          {
            value: JSON.stringify({
              userId,
              cart: parsedCart,
              amount,
              sessionId,
            }),
          },
        ],
      });
    } catch (err) {
      console.error("Kafka publish failed", err);
    }

    return res.status(200).send({ message: "Payment verified" });
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).send(err.message);
});

app.listen(8000, () => {
  connectToKafka();
  console.log("Payment service is running on port 8000");
});