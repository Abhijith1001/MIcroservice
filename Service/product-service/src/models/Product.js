import mongoose from "mongoose";

export const ProductSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  variants: [
    {
      sku: String,
      price: Number,
      stock: Number
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

export default ProductSchema;
