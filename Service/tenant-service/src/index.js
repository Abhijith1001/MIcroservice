import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from 'cors';




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
app.use(express.json());

const corsOptions = {
  origin: ["http://localhost:5173", "https://saas-tenent-service.onrender.com","*"],
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

if (!process.env.TENANT_REGISTRY_URI) {
  console.error("TENANT_REGISTRY_URI is not set. Check your .env file.");
  process.exit(1);
}
await mongoose.connect(process.env.TENANT_REGISTRY_URI);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


import tenantsRouter from "./routes/tenants.js";


app.use("/api", tenantsRouter);



app.listen(4100, () => console.log("Tenant service running on 4100"));
