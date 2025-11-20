import express from "express";
import { getTenantConnection } from "../../../shared/src/connectionManager.js";
import { ProductSchema } from "../models/Product.js";

const productsRouter = express.Router();
productsRouter.use(express.json());

productsRouter.post("/products", async (req, res) => {
  const dbUri = req.headers["x-tenant-db-uri"];

  if (!dbUri) return res.status(400).json({ error: "Missing tenant DB" });

  const conn = await getTenantConnection(dbUri);
  const Product = conn.model("Product", ProductSchema);

  const product = await Product.create(req.body);
  res.json(product);
});

export default productsRouter;



// import express from "express";
// import crypto from "crypto";
// import { getTenantConnection } from "../../../shared/src/connectionManager.js";
// import { ProductSchema } from "../models/Product.js";

// const productsRouter = express.Router();
// productsRouter.use(express.json());

// productsRouter.post("/products", async (req, res) => {
//   try {
//     const dbUri = req.headers["x-tenant-db-uri"];
//     const sig = req.headers["x-tenant-sig"];
//     const tenantId = req.headers["x-tenant-id"];

//     if (!dbUri || !sig || !tenantId) {
//       return res.status(400).json({ error: "Missing tenant headers" });
//     }

//     // 🔒 verify tenant signature
//     const payload = tenantId + "|" + dbUri;
//     const expected = crypto
//       .createHmac("sha256", process.env.GATEWAY_SECRET)
//       .update(payload)
//       .digest("hex");

//     if (sig !== expected) {
//       return res.status(401).json({ error: "Invalid tenant signature" });
//     }

//     // 🔗 connect to tenant DB
//     const conn = await getTenantConnection(dbUri);
//     const Product = conn.model("Product", ProductSchema);

//     // 🧾 data validation
//     const { title, price, variants } = req.body;
//     if (!title || !price) {
//       return res.status(422).json({ error: "title and price are required" });
//     }

//     const product = await Product.create(req.body);
//     res.json(product);

//   } catch (err) {
//     console.error("Product create error:", err);
//     res.status(500).json({ error: "Product creation failed" });
//   }
// });

// export default productsRouter;
