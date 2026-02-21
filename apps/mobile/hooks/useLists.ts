/**
 * React Query hook for lists. Uses api from AuthContext; caches and dedupes.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { getCachedLists, setCachedLists } from "../lib/offline";
import type { List } from "@cartscout/types";

function dedupeById(lists: List[]): List[] {
  const seen = new Set<string>();
  return lists.filter((l) => {
    if (!l?.id || seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
}

const LISTS_QUERY_KEY = ["lists"] as const;

export function useLists() {
  const { api, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...LISTS_QUERY_KEY, isAuthenticated],
    queryFn: async (): Promise<{ lists: List[]; fromCache: boolean }> => {
      try {
        const res = await api.lists(false);
        const lists = dedupeById(res.data ?? []);
        await setCachedLists(lists);
        return { lists, fromCache: false };
      } catch {
        const cached = await getCachedLists();
        if (Array.isArray(cached) && cached.length > 0) {
          return { lists: dedupeById(cached as List[]), fromCache: true };
        }
        throw new Error("Failed to load lists");
      }
    },
    enabled: isAuthenticated,
  });

  const createListMutation = useMutation({
    mutationFn: (name?: string) => api.createList({ name: name ?? "New list" }),
    onSuccess: (res) => {
      if (res.data) {
        queryClient.setQueryData<{ lists: List[]; fromCache: boolean }>([...LISTS_QUERY_KEY, true], (prev) =>
          prev ? { lists: dedupeById([res.data as List, ...prev.lists]), fromCache: false } : prev
        );
      }
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (id: string) => api.deleteList(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<{ lists: List[]; fromCache: boolean }>([...LISTS_QUERY_KEY, true], (prev) =>
        prev ? { lists: (prev.lists ?? []).filter((l) => l.id !== id), fromCache: prev.fromCache } : prev
      );
    },
  });

  const lists = query.data?.lists ?? [];
  const isOffline = query.data?.fromCache === true;

  return {
    lists,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isOffline,
    createList: createListMutation.mutateAsync,
    createListPending: createListMutation.isPending,
    deleteList: deleteListMutation.mutateAsync,
    deleteListPending: deleteListMutation.isPending,
  };
}
