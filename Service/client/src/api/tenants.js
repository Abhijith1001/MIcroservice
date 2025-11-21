import { useMutation } from "@tanstack/react-query";
import axios from "axios";

import { API_GATEWAY_BASE } from "./config";

export function useRegisterTenant() {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axios.post(`${API_GATEWAY_BASE}/tenant/tenants/register`, payload);

      return data;
    },
  });
}