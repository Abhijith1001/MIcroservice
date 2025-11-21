import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();

const SERVICE_MAP = {
  payment: process.env.PAYMENT_SERVICE_BASE || "http://localhost:8000/payment-service",
  tenant: process.env.TENANT_SERVICE_BASE || "http://localhost:4100/api",
  product: process.env.PRODUCT_SERVICE_BASE || "http://localhost:4300/api",
};

const ALLOWED_ORIGINS = (process.env.GATEWAY_ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "x-tenant-id",
  "x-tenant-db-uri",
  "x-tenant-sig",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    allowedHeaders: ALLOWED_HEADERS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());

// Force CORS headers on gateway responses (preflight + proxied)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin))) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", ALLOWED_HEADERS.join(", "));
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

const proxyRequest = async (targetUrl, req, res, next) => {
  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,
      },
      params: req.query,
      responseType: "json",
    });

    res.status(response.status).send(response.data);
  } catch (err) {
    const status = err.response?.status || 502;
    const message = err.response?.data || err.message;
    res.status(status).send(message);
  }
};

app.use((req, res, next) => {
  const segments = req.path.split("/");
  const service = segments[1];
  const baseUrl = SERVICE_MAP[service];

  if (!baseUrl) {
    return res.status(404).send({ error: "Service not configured on gateway" });
  }

  const restPath = segments.slice(2).join("/");
  const targetUrl = restPath ? `${baseUrl}/${restPath}` : baseUrl;

  return proxyRequest(targetUrl, req, res, next);
});

app.listen(7000, () => {
  console.log("API Gateway listening on 7000");
});
