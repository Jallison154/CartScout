/**
 * React Query hook for a single list (with items). Uses api from AuthContext.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import type { List, ListItem, Store } from "@cartscout/types";

const LISTS_QUERY_KEY = ["lists"] as const;

function listQueryKey(id: string) {
  return ["list", id] as const;
}

export function useList(listId: string | undefined) {
  const { api, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...listQueryKey(listId ?? ""), isAuthenticated],
    queryFn: () => api.list(listId!, true).then((res) => res.data ?? null),
    enabled: Boolean(isAuthenticated && listId),
  });

  const list = query.data ?? null;

  const invalidateList = () => {
    if (listId) queryClient.invalidateQueries({ queryKey: listQueryKey(listId) });
    queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEY });
  };

  const addItemMutation = useMutation({
    mutationFn: (body: { canonical_product_id?: string; free_text?: string; quantity?: number }) =>
      api.addListItem(listId!, body),
    onSuccess: invalidateList,
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: { quantity?: number; checked?: boolean } }) =>
      api.updateListItem(listId!, itemId, body),
    onSuccess: invalidateList,
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => api.deleteListItem(listId!, itemId),
    onSuccess: invalidateList,
  });

  const updateListMutation = useMutation({
    mutationFn: (body: { name?: string; list_type?: string; week_start?: string }) =>
      api.updateList(listId!, body),
    onSuccess: invalidateList,
  });

  const setListStoresMutation = useMutation({
    mutationFn: (storeIds: string[]) => api.setListStores(listId!, storeIds),
    onSuccess: invalidateList,
  });

  return {
    list,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    addItem: addItemMutation.mutateAsync,
    addItemPending: addItemMutation.isPending,
    updateListItem: (itemId: string, body: { quantity?: number; checked?: boolean }) =>
      updateItemMutation.mutateAsync({ itemId, body }),
    updateItemPending: updateItemMutation.isPending,
    deleteItem: deleteItemMutation.mutateAsync,
    deleteItemPending: deleteItemMutation.isPending,
    updateList: updateListMutation.mutateAsync,
    updateListPending: updateListMutation.isPending,
    setListStores: setListStoresMutation.mutateAsync,
    setListStoresPending: setListStoresMutation.isPending,
  };
}
