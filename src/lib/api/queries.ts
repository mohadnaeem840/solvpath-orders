import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getOrder, listOrders, type ListParams, type OrderStatus } from "../mockApi";

export interface OrdersQueryKey {
  page: number;
  pageSize: number;
  status: OrderStatus | "all";
  query: string;
}

export const ordersQuery = (params: OrdersQueryKey) =>
  queryOptions({
    queryKey: ["orders", params] as const,
    queryFn: ({ signal }) => listOrders({ ...params, signal } as ListParams),
    staleTime: 30_000,
  });

export interface OrdersInfiniteKey {
  pageSize: number;
  status: OrderStatus | "all";
  query: string;
}

export const ordersInfiniteQuery = (params: OrdersInfiniteKey) =>
  infiniteQueryOptions({
    queryKey: ["orders", "infinite", params] as const,
    queryFn: ({ pageParam, signal }) =>
      listOrders({
        page: pageParam,
        pageSize: params.pageSize,
        status: params.status,
        query: params.query,
        signal,
      } as ListParams),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.pageSize;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    staleTime: 30_000,
  });

export const orderQuery = (orderId: string) =>
  queryOptions({
    queryKey: ["order", orderId] as const,
    queryFn: ({ signal }) => getOrder(orderId, signal),
    staleTime: 30_000,
  });
