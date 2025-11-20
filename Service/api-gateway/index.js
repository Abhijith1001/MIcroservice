import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();

const SERVICE_MAP = {
  payment: process.env.PAYMENT_SERVICE_BASE || "http://localhost:8000/payment-service",
};

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.use(express.json());

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
