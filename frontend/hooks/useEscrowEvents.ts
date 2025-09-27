"use client";

import { useEffect, useRef, useState } from "react";
import type {
  EscrowLogEvent,
  EscrowStreamPayload,
  EscrowStreamStatus,
} from "@/lib/escrow-events";

interface UseEscrowEventsOptions {
  limit?: number;
  autoStart?: boolean;
}

interface UseEscrowEventsResult {
  events: EscrowLogEvent[];
  status: EscrowStreamStatus;
  error?: string;
  cursor?: string;
}

const parseEvent = (event: MessageEvent<string>): EscrowStreamPayload | null => {
  try {
    const payload = JSON.parse(event.data) as EscrowStreamPayload;
    return payload;
  } catch (error) {
    console.error("Failed to parse event stream payload", error);
    return null;
  }
};

export const useEscrowEvents = (
  options: UseEscrowEventsOptions = {},
): UseEscrowEventsResult => {
  const { limit = 40, autoStart = true } = options;
  const [events, setEvents] = useState<EscrowLogEvent[]>([]);
  const [status, setStatus] = useState<EscrowStreamStatus>("idle");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!autoStart || typeof window === "undefined") {
      return () => undefined;
    }

    let isCancelled = false;

    const connect = () => {
      if (isCancelled) return;
      setStatus((prev) => (prev === "idle" ? "connecting" : "reconnecting"));
      setError(undefined);

      const eventSource = new EventSource("/api/escrow-events");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (isCancelled) return;
        setStatus("open");
      };

      eventSource.onerror = (event) => {
        console.error("Escrow SSE connection error", event);
        if (isCancelled) return;
        setStatus("error");
        setError("Connection lost. Retrying...");
        eventSource.close();
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      eventSource.addEventListener("cursor", (event) => {
        const payload = parseEvent(event as MessageEvent<string>);
        if (payload?.cursor) {
          setCursor(payload.cursor);
        }
      });

      eventSource.addEventListener("error", (event) => {
        const payload = parseEvent(event as MessageEvent<string>);
        if (payload?.event?.data) {
          setError(payload.event.data);
        }
      });

      eventSource.onmessage = (event) => {
        const payload = parseEvent(event);
        if (!payload || !payload.event || payload.event.address == null) {
          return;
        }
        setEvents((prev) => {
          const next = [payload.event, ...prev];
          return next.slice(0, limit);
        });
      };
    };

    connect();

    return () => {
      isCancelled = true;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setStatus("closed");
    };
  }, [autoStart, limit]);

  return { events, status, error, cursor };
};
