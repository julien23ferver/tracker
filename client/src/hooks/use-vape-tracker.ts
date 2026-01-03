import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertEntry, type InsertCoil } from "@shared/routes";
import { z } from "zod";

// Helper to safely parse API responses with logging
function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    // In production we might throw, but for dev we'll try to return data if possible or throw
    throw result.error;
  }
  return result.data;
}

export function useAppState() {
  return useQuery({
    queryKey: [api.state.get.path],
    queryFn: async () => {
      const res = await fetch(api.state.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Impossible de charger les données");
      const data = await res.json();
      return parseWithLogging(api.state.get.responses[200], data, "state.get");
    },
    // Refresh often to keep calculations somewhat fresh if multiple tabs open
    staleTime: 1000 * 60, 
  });
}

export function useAddEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertEntry) => {
      // Coerce numbers for robustness
      const payload = {
        ...data,
        coilId: Number(data.coilId),
        puffs: Number(data.puffs),
        mlAdded: Number(data.mlAdded),
        measuredOhms: Number(data.measuredOhms),
      };
      
      const validated = api.entries.create.input.parse(payload);
      
      const res = await fetch(api.entries.create.path, {
        method: api.entries.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.entries.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Erreur lors de l'ajout");
      }
      
      return api.entries.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.state.get.path] });
    },
  });
}

export function useResetCoil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCoil) => {
      const payload = {
        ...data,
        initialOhms: Number(data.initialOhms),
      };

      const validated = api.coils.reset.input.parse(payload);

      const res = await fetch(api.coils.reset.path, {
        method: api.coils.reset.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.coils.reset.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Erreur lors de la création de la résistance");
      }

      return api.coils.reset.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.state.get.path] });
    },
  });
}
