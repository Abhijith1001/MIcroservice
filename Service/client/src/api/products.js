import { useMutation } from "@tanstack/react-query";
import axios from "axios";

import { API_GATEWAY_BASE } from "./config";

export function useCreateProduct() {
  return useMutation({
    mutationFn: async ({ product, tenantDbUri }) => {
      const { data } = await axios.post(`${API_GATEWAY_BASE}/product/products`, product, {
        headers: {
          "x-tenant-db-uri": tenantDbUri,
        },
      });

      return data;
    },
  });
}