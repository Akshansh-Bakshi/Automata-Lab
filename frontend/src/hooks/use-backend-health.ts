"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiClientError, getHealth } from "@/lib/api/client";
import type { HealthResponse } from "@/lib/api/types";

export type BackendHealthState =
  | { status: "checking"; data: null; message: string }
  | { status: "connected"; data: HealthResponse; message: string }
  | { status: "unavailable"; data: null; message: string };

export function useBackendHealth() {
  const [state, setState] = useState<BackendHealthState>({
    status: "checking",
    data: null,
    message: "Checking API connection",
  });

  const check = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await getHealth({ signal });
      setState({ status: "connected", data, message: `API v${data.version} connected` });
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "REQUEST_CANCELLED") {
        return;
      }
      setState({
        status: "unavailable",
        data: null,
        message: error instanceof Error ? error.message : "Backend unavailable",
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void check(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [check]);

  const retry = () => {
    setState({ status: "checking", data: null, message: "Checking API connection" });
    void check();
  };

  return { ...state, retry };
}

