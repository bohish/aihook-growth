import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { getConnectionState } from "@/lib/tiktok.functions";
import type { ConnectionState } from "@/lib/types";

/**
 * Authoritative connection state, read from the server (tokens stay server-side).
 * There is no local/demo mirror: an unauthenticated visitor is simply
 * "disconnected".
 */
export function useConnection() {
  const { user } = useAuth();

  const query = useQuery<ConnectionState>({
    queryKey: ["tiktok-connection", user?.id ?? "anon"],
    queryFn: () => getConnectionState(),
    enabled: Boolean(user),
    staleTime: 15_000,
  });

  const connection: ConnectionState = user
    ? (query.data ?? { status: "disconnected" })
    : { status: "disconnected" };

  return {
    connection,
    isLoading: Boolean(user) && query.isLoading,
    refetch: query.refetch,
  };
}
