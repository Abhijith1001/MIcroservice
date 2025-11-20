import { useMutation } from "@tanstack/react-query";
import axios from "axios";

export function useRegisterTenant() {
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axios.post("http://localhost:4100/api/tenants/register", payload);
      return data;
    },
  });
}