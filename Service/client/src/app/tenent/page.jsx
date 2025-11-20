"use client";

import { useState } from "react";

import CreateProductPage from "@/app/product/page";
import { useRegisterTenant } from "../../api/tenants";

function TenantRegisterPage() {
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const registerTenant = useRegisterTenant();

  const handleSubmit = (e) => {
    e.preventDefault();
    registerTenant.mutate({ name, subdomain });
  };

  const data = registerTenant.data;

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-white rounded-lg shadow p-6 ">
        <h2 className="text-lg font-semibold mb-4">Register new tenant</h2>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="tenant-name">
              Store / Company name
            </label>
            <input
              id="tenant-name"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="tenant-subdomain">
              Subdomain
            </label>
            <input
              id="tenant-subdomain"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="my-store"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Will become `subdomain.MAIN_DOMAIN`.
            </p>
          </div>

          <button
            type="submit"
            disabled={registerTenant.isPending}
            className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {registerTenant.isPending ? "Creating..." : "Create tenant"}
          </button>
        </form>

        {registerTenant.isError && (
          <p className="mt-4 text-sm text-red-600">
            Error: {registerTenant.error?.response?.data?.error || "Something went wrong"}
          </p>
        )}

        {data && (
          <div className="mt-4 text-sm bg-slate-50 border border-slate-200 rounded p-3 space-y-1">
            <div className="font-semibold">Tenant created!</div>
            <div>Tenant ID: {data.tenantId}</div>
            <div>DB URI: {data.dbUri}</div>
            <div>Store URL: {data.fullSubdomain}</div>
          </div>
        )}
      </div>
      <CreateProductPage />
    </div>
  );
}

export default TenantRegisterPage;