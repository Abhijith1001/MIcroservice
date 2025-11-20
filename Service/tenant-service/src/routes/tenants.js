import express from "express";
import mongoose from "mongoose";
import Tenant from "../models/Tenant.js";

const router = express.Router();

router.get("/resolve", async (req, res) => {
  const host = (req.query.host || "").toLowerCase();
  const main = process.env.MAIN_DOMAIN;

  let tenant;
  if (host.endsWith(main)) {
    const sub = host.replace("." + main, "");
    tenant = await Tenant.findOne({ subdomain: sub }).lean();
  } else {
    tenant = await Tenant.findOne({ customDomain: host }).lean();
  }

  if (!tenant) return res.json(null);

  res.json({
    tenantId: tenant.tenantId,
    dbUri: tenant.dbUri,
  });
});

router.post("/tenants/register", async (req, res) => {
  const { name, subdomain } = req.body;

  const sub = subdomain.toLowerCase().replace(/[^a-z0-9]/g, "");

  const tenantId = "tenant_" + Date.now();
  const dbName = "store_" + tenantId;
  const dbUri = `${process.env.MONGO_BASE_URI}/${dbName}`;

  await Tenant.create({
    tenantId,
    name,
    subdomain: sub,
    dbName,
    dbUri,
    status: "ACTIVE",
    createdAt: new Date(),
  });

  const conn = await mongoose.createConnection(dbUri).asPromise();

  const StoreInitSchema = new mongoose.Schema({
    initialized: Boolean,
    createdAt: Date,
  });

  const StoreInit = conn.model("Init", StoreInitSchema);
  await StoreInit.create({ initialized: true, createdAt: new Date() });

  res.json({
    message: "Store created successfully",
    tenantId,
    dbUri,
    fullSubdomain: `${sub}.${process.env.MAIN_DOMAIN}`,
  });
});

export default router;
