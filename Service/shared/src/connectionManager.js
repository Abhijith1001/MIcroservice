import mongoose from "mongoose";

const connections = new Map();

export async function getTenantConnection(dbUri) {
  if (connections.has(dbUri)) return connections.get(dbUri);

  const conn = await mongoose.createConnection(dbUri).asPromise();
  connections.set(dbUri, conn);
  return conn;
}
