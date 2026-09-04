import { useCallback, useEffect, useState } from "react";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface ConnectionState {
  status: ConnectionStatus;
  isDemo: boolean;
  message?: string;
}

const KEY = "tga.connection.v1";
const DEFAULT: ConnectionState = { status: "disconnected", isDemo: true };

function read(): ConnectionState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as ConnectionState) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/**
 * Local mirror of the TikTok integration state. The authoritative record lives
 * in `tiktok_connections` (tokens server-side only); this keeps the UI honest
 * about which of the four states the user is in.
 */
export function useConnection() {
  const [state, setState] = useState<ConnectionState>(DEFAULT);

  useEffect(() => setState(read()), []);

  const update = useCallback((next: ConnectionState) => {
    setState(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  return { connection: state, setConnection: update };
}
