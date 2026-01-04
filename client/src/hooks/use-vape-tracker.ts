import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type InsertEntry, type InsertCoil } from "@shared/schema";
import { storage } from "../lib/storage";

// Keys for React Query
const KEYS = {
  STATE: ["state"],
};

export function useAppState() {
  return useQuery({
    queryKey: KEYS.STATE,
    queryFn: async () => {
      // Simulate network delay slightly for better UX feel (optional) or just return directly
      return storage.getAppState();
    },
    // Since it's local, we can consider it always fresh, 
    // but invalidating on mutation will force a re-read.
    staleTime: Infinity, 
  });
}

export function useAddEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertEntry) => {
      return storage.addEntry(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.STATE });
    },
  });
}

export function useResetCoil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCoil) => {
      return storage.resetCoil(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.STATE });
    },
  });
}