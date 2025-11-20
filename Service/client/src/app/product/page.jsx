"use client"
import { useState } from "react";
import { useCreateProduct } from "../../api/products";

function CreateProductPage() {
  const [tenantDbUri, setTenantDbUri] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const createProduct = useCreateProduct();

  const handleSubmit = (e) => {
    e.preventDefault();
    createProduct.mutate({
      tenantDbUri,
      product: {
        name,
        price: Number(price),
        description,
      },
    });
  };

  const data = createProduct.data;

  return (
    <div className="bg-white rounded-lg shadow p-6 ">
      <h2 className="text-lg font-semibold mb-4">Create product</h2>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">
            Tenant DB URI
          </label>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={tenantDbUri}
            onChange={(e) => setTenantDbUri(e.target.value)}
            placeholder="mongodb://..."
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Use the `dbUri` returned from tenant registration.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Price</label>
          <input
            type="number"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={createProduct.isPending}
          className="inline-flex items-center justify-center rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {createProduct.isPending ? "Saving..." : "Create product"}
        </button>
      </form>

      {createProduct.isError && (
        <p className="mt-4 text-sm text-red-600">
          Error: {createProduct.error?.response?.data?.error || "Something went wrong"}
        </p>
      )}

      {data && (
        <div className="mt-4 text-sm bg-slate-50 border border-slate-200 rounded p-3 space-y-1">
          <div className="font-semibold">Product created!</div>
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default CreateProductPage;