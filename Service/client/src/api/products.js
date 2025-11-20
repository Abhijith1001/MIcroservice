import { useMutation } from "@tanstack/react-query";
import axios from "axios";

export function useCreateProduct() {
  return useMutation({
    mutationFn: async ({ product, tenantDbUri }) => {
      const { data } = await axios.post("http://localhost:4300/api/products", product, {
        headers: {
          "x-tenant-db-uri": tenantDbUri,
        },
      });
      return data;
    },
  });
}